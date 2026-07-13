---
type: readingNote
---
# Protobuf 工作流程与编解码原理（beagle 项目）

> 本笔记整理自网络协议链路的分析。\
> 协议唯一可信源：`data/NetMessage/protobuf/`（个人分支 `protobuf_*` 不可信）。\
> 运行期 pb 库是 lua-protobuf（作者 Xavier Wang，库名 `pb`，项目里叫 `starwing_pb` / `starwing_protoc`）。\
> 其 C 实现（`pb.h` / `pb.c`）在引擎侧（beagle_engine / Engine.dll），本仓库无源码，字节级细节为按开源库标准语义的推断。

***

## 一、整体工作流程

项目不走"每个 message 生成强类型代码"的传统模式，而是：\
**构建期把 proto 编成 descriptor binary，运行期用** `starwing_pb` **按 message 名动态 encode/decode。**

```typescript
[协议源]  data/NetMessage/protobuf/
            message.proto   业务 message 定义
            api.lua         ApiXxxReq/Ack/Ntf 数字 id + api_table(id->message名)
            error/const/common.proto

[构建期]  data/NetMessage/build.py
            modApiLua()              处理 api.lua，补出 key_table
            buildStarwingProtoBinary protoc 把 proto 编成 descriptor，转义成 lua
            输出到 data/ls/ExportDatas/protobufData/
                api.lua
                starwing_message_binary.lua   (内容: starwing_protoc:load_pb('\10\52...'))

[Lua 启动]  GameLoading.lua
              -> LuaLoaderNet.lua
                -> RequireProtobufs.lua
                   require api.ls
                   require starwing_protoc.ls         (lua-protobuf 的 protoc.lua)
                   starwing_pb.option("no_default_values")
                   starwing_pb.option("enum_as_value")
                   starwing_protoc = starwing_protoc_parser.new()
                   require starwing_message_binary.ls  -> starwing_protoc:load_pb(binary) -> pb.load
                   遍历 starwing_pb.types()/fields() 构建 pb_const / ErrorCode
                -> NetCallbacks.lua                    服务端主动推送(Ntf)的静态回调表
                -> NetMgr.lua
                   starwing_pb.set_api_table(api_module.api_table)

[发送]  业务 NetMgr:SendRequest(ApiXxxReq, req, cb, ApiXxxAck)
          -> WrapGuestReq (playerId 非 nil 时封装成 GuestReq 代理)
          -> DoSendMsg -> socket.sendProtobuf(api, req)
                 引擎: name=api_table[api]; body=pb.encode(name, req)
                       pkt=pb.encode("Msg", {Api=api, Payload=body})
          -> DoAddCallback (登记回调, expectedApi=ApiXxxAck, 带超时)

[接收]  NetMgr:Update 每帧 socket.readProtobuf(HandleNetMsg)
          引擎: 解出 Msg{Api,Payload}; name=api_table[Api]; ack=pb.decode(name,Payload)
          -> HandleNetMsg -> ProcessAck(pcall) -> DispatchAck
               1. ApiGuestAck -> 再解一层内层 Msg
               2. NetSmoothBuffer 平滑队列
               3. NetCallbacks[api] 静态回调(主动推送 Ntf)
               4. 遍历 callBacks 匹配 expectedApi / CommAck 的 ack.Api
```

### 新增一个协议的步骤

1. 改主干 `message.proto` + `api.lua`
2. 跑 NetMessage 构建，生成 `protobufData/`
3. Lua 侧用 `api_module.ApiXxxReq/Ack` 收发
4. 服务端主动推送的，在 `NetCallbacks.lua` 注册 `Ntf`

***

## 二、两种容易混淆的 binary

|                       | 是什么                   | 谁产生             | 谁消费         | 内容                           |
| --------------------- | --------------------- | --------------- | ----------- | ---------------------------- |
| **descriptor binary** | message 的结构定义(schema) | 构建期 `protoc -o` | `pb.load`   | "有个类型 KV，字段 K 号 1 是 string…" |
| **message binary**    | 一个实例的数据               | `pb.encode`     | `pb.decode` | "K=某串，V=某串"                  |

- "怎么编成 binary" = 第①种（构建期 descriptor）。
- "encode/decode" = 第②种（运行期数据）。
- 两者共用 load 阶段建好的同一份类型索引 `pb_State`。

***

## 三、底层原语（pb.h）

```c
typedef struct pb_Slice  { const char *p, *end; } pb_Slice;   // 只读：解码输入
typedef struct pb_Buffer { char *buff; size_t size, capacity; } pb_Buffer; // 可写：编码输出

size_t pb_addvarint64(pb_Buffer *b, uint64_t n);   // 写变长整数
size_t pb_addfixed32 (pb_Buffer *b, uint32_t n);   // 写 4 字节定长
size_t pb_addfixed64 (pb_Buffer *b, uint64_t n);   // 写 8 字节定长
size_t pb_addbytes   (pb_Buffer *b, pb_Slice s);   // 写 length-delimited
size_t pb_readvarint64(pb_Slice *s, uint64_t *v);  // s 游标推进, 值写到 *v, 返回读了几字节
size_t pb_readbytes   (pb_Slice *s, pb_Slice *out);

uint64_t pb_encode_sint64(int64_t v){ return ((uint64_t)v<<1) ^ (v>>63); } // zigzag
int64_t  pb_decode_sint64(uint64_t v){ return (int64_t)(v>>1) ^ -(int64_t)(v&1); }

#define pb_pair(tag,wt) (((tag)<<3) | ((wt)&7))   // 组 tag
#define pb_gettag(v)    ((v) >> 3)                // 拆字段号
#define pb_gettype(v)   ((v) &  7)                // 拆 wire type
```

### C 函数声明写法

`size_t pb_addvarint64(pb_Buffer *b, uint64_t n);` 是 C 函数原型（声明，以 `;` 结尾，无函数体）：

- `size_t` 返回类型（无符号整数，表示字节数）
- `pb_Buffer *b` 传指针：函数要修改调用方真实 buffer（C 传参是值拷贝，传指针才能改原对象）
- `uint64_t n` 纯输入值，传值即可
- 输出参数模式：`pb_readvarint64(pb_Slice *s, uint64_t *v)` 用 `*v` 把结果带回（返回值已被用作"读了几字节"）

### varint 编码

每字节低 7 位存数据，最高位 1 表示"还有后续字节"。例：`150` -> `0x96 0x01`。

***

## 四、wire type 与 tag

### wire type（线类型，3 bit）

| wire type     | 值 | 用于                                    |
| ------------- | - | ------------------------------------- |
| VARINT        | 0 | int32/64, uint32/64, sint, bool, enum |
| I64           | 1 | fixed64, sfixed64, double             |
| LEN           | 2 | string, bytes, 嵌套 message, packed 数组  |
| (group start) | 3 | 废弃                                    |
| (group end)   | 4 | 废弃                                    |
| I32           | 5 | fixed32, sfixed32, float              |

### tag

每个字段值前的"路标"，把字段号 + wire type 打包成一个整数（本身也按 varint 编码）。

```text
tag = (field_number << 3) | wire_type     // 计算
field_number = tag >> 3                     // 拆解
wire_type     = tag & 7                      // 拆解(7 = 0b111)
```

低 3 位放 wire type（0~5），高位放字段号。

例：`string K = 1`，string -> LEN(2)：

```text
field_number=1 -> 0000 0001
<<3:             0000 1000  (8)
wire_type=2 ->        010
| :              0000 1010  = 10 = 0x0A
```

所以 K 的 tag = `0x0A`。`string V = 2` -> `(2<<3)|2 = 0x12`。

大字段号 tag 占多字节：`Name = 16`(LEN) -> `(16<<3)|2 = 130` >= 128 -> varint `0x82 0x01`。\
=> 高频字段建议用 1~15 的字段号（tag 只占 1 字节）。

***

## 五、field type 常量（schema 里字段声明类型）

```c
PB_Tdouble=1  PB_Tfloat=2   PB_Tint64=3   PB_Tuint64=4  PB_Tint32=5
PB_Tfixed64=6 PB_Tfixed32=7 PB_Tbool=8    PB_Tstring=9  PB_Tgroup=10
PB_Tmessage=11 PB_Tbytes=12 PB_Tuint32=13 PB_Tenum=14
PB_Tsfixed32=15 PB_Tsfixed64=16 PB_Tsint32=17 PB_Tsint64=18
```

***

## 六、类型注册表数据结构

```c
typedef struct pb_Field {
    pb_Name *name; pb_Name *type_name; const pb_Type *type;
    int32_t number; unsigned type_id:5, repeated:1, packed:1, scalar:1;
    pb_Slice default_value;
} pb_Field;

typedef struct pb_Type {
    pb_Name *name;          // ".pb.KV"
    pb_Table field_tags;    // 索引①: number  -> pb_Field  (decode 用)
    pb_Table field_names;   // 索引②: name    -> pb_Field  (encode 用)
    unsigned field_count, is_enum:1, is_map:1, is_proto3:1;
} pb_Type;

typedef struct pb_State {
    pb_NameTable nametable; // 字符串内化池
    pb_Table types;         // 名字 -> pb_Type
} pb_State;
```

关键：每个 pb_Type 存两份字段索引——按 number(decode)、按 name(encode)。

***

## 七、load / encode / decode 实现过程

### pb.load(data)

`data` = FileDescriptorSet 序列化字节。手写 wire 解析器（不能用库自身解析定义自身的 schema）：

1. 读 FileDescriptorSet.field 1 (file) -> 每个 FileDescriptorProto
2. 读 package -> 类型名前缀；读 message_type/enum_type
3. 每个 DescriptorProto: pb_newtype 建 pb_Type；每个 FieldDescriptorProto: pb_newfield，挂进 field_tags[number] 和 field_names[name]
4. resolve: 把 f->type_name 引用解析成 f->type，确定 scalar/packed
- **无返回对象，只改写全局 pb_State**。
- Lua 返回值: 成功 `true,pos`；失败 `false,pos`（所以 load_pb 判 ret 否则 error）。

### pb.encode(typename, table) —— schema 驱动

查到 pb_Type，**遍历它定义的字段**，按字段名去 table 取值：

- 标量: 写 tag(number<<3|wiretype) + 值（varint/fixed32/fixed64/length-delimited）
- 嵌套 message: 写 tag(LEN)，递归编码进同一 buffer，再用 lpb_addlength 回填长度前缀
- repeated:
  - packed(proto3 标量默认): 一个 tag(LEN) + 总长 + 所有值连续
  - 非 packed(repeated message): 每元素各写 tag+值
- map: 当 repeated MapEntry 处理
- sint 用 zigzag；最后 pb_Buffer -> Lua string

`lpb_addlength` 回填技巧：长度要内容写完才知道，先写内容，再把长度 varint 插到内容前（memmove 内容后移）。

### pb.decode(typename, data) —— 字节流驱动

新建结果 table，循环读 tag，**用 number 反查字段**：

```c
while (pb_readvarint32(s, &tag)) {
    number=pb_gettag(tag); wiretype=pb_gettype(tag);
    f = pb_field(t, number);
    if (f==NULL) { pb_skipvalue(s, wiretype); continue; } // 未知字段跳过(前后兼容)
    // 按 f->type_id 读值; scalar->setfield; repeated->数组追加; message->递归; map->子表
}
```

### 两个 option 的影响（项目设置）

- `no_default_values`: decode 不预填默认值，缺省字段保持 `nil`（=> Lua 侧读字段常写 `x or 0` / `x or false`）
- `enum_as_value`: enum 解码成数字而非名字字符串（=> 比较 enum 用 pb_const 数字常量）

***

## 八、完整字节级实例：message KV

```protobuf
message KV { string K = 1; string V = 2; }   // package pb, proto3
```

### (1) 构建期 proto -> descriptor binary

自底向上拼（FieldDescriptorProto: name=1,number=3,label=4,type=5）：

字段 K 的 descriptor（9 字节）:

```typescript
0A 01 4B   18 01   20 01   28 09
name="K"   num=1   label=1 type=9(STRING)
```

字段 V 的 descriptor（9 字节）:

```text
0A 01 56   18 02   20 01   28 09
```

KV 的 DescriptorProto（26 字节, name=1, field=2 repeated）:

```text
0A 02 4B 56   12 09 <K的9字节>   12 09 <V的9字节>
```

FileDescriptorProto（name=1,package=2,message_type=4,syntax=12）:

```text
0A 0A "temp.proto"   12 02 "pb"   22 1A <KV的26字节>   62 06 "proto3"
```

FileDescriptorSet（file=1）:

```text
0A 34 <52字节FileDescriptorProto>
```

=> 转义写进 starwing_message_binary.lua: `starwing_protoc:load_pb('\10\52\10\10\116...')`\
（`\10`=0x0A, `\52`=0x34, 十进制转义）

### (2) load

解析上面字节 -> pb_State.types[".pb.KV"]：

```text
field_tags  = { [1]=FieldK, [2]=FieldV }
field_names = { ["K"]=FieldK, ["V"]=FieldV }
FieldK = {name="K", number=1, type_id=9(string), scalar=1}
FieldV = {name="V", number=2, type_id=9(string), scalar=1}
```

### (3) encode {K="ab", V="xy"}

遍历字段，按名取值：

```yaml
K: tag=(1<<3)|2=0x0A, len=2, "ab"=61 62  -> 0A 02 61 62
V: tag=(2<<3)|2=0x12, len=2, "xy"=78 79  -> 12 02 78 79
输出(8字节): 0A 02 61 62 12 02 78 79
```

（注意：这 8 字节是"数据"，与第(1)步 50+ 字节的"结构说明"完全不同）

### (4) decode 0A 02 61 62 12 02 78 79

```javascript
tag 0A -> num=1,wt=2 -> FieldK -> len2 "ab" -> result.K="ab"
tag 12 -> num=2,wt=2 -> FieldV -> len2 "xy" -> result.V="xy"
=> { K="ab", V="xy" }
```

若遇到 schema 没有的字段号 -> pb_field 返回 NULL -> pb_skipvalue 跳过（前后兼容）。

***

## 九、项目实战要点（eng.ntable 铁则）

- 网络回调里的 `ack` 及其所有子字段是 `eng.ntable`，**仅当帧有效**，跨帧持有 = crash（lapi.c 断言）。
- 跨帧/存 Handler/Mgr/UI/定时器/异步回调前，必须 `Utils:TableClone` 或手动提取字段到纯 Lua table。
- repeated 字段优先 `ipairs(xxx or {})`，避免 `#xxx` 或直接索引引擎容器（原生崩溃风险）。
- 缺省字段是 nil：读 number 字段 `x or 0`，bool `x or false`。
- 请求去重优先 `NetMgr:HasRequest(api)`。

### 两层封包（Msg 外壳）

业务 Req/Ack 永远被包在 `Msg{ int32 Api; bytes Payload }` 里收发，`Api` 字段是路由依据：

```text
发: body=encode("PowerDetailReq", req); pkt=encode("Msg", {Api=1068, Payload=body})
收: msg=decode("Msg", payload); name=api_table[msg.Api]; ack=decode(name, msg.Payload)
```

### 应答匹配规则（DispatchAck）

1. ApiGuestAck: 先解外层拿 TargetId，再 DecodeMsgProtobuf 解内层
2. NetSmoothBuffer 平滑队列优先
3. NetCallbacks[api] 静态表（服务端主动推送 Ntf 走这里，不进 callBacks）
4. 普通 Req/Ack: 遍历 callBacks 匹配 `cb.expectedApi == api`
5. CommAck(通用错误码): 匹配 `cb.api == ack.Api`，按 ack.Code 处理错误

***
