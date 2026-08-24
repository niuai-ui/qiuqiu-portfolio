# 湫湫 Sims 汉化档案馆

完全静态、免费托管于 GitHub Pages 的个人作品集。内容由项目最外层的 `作品信息.xlsx` 管理。

## 更新作品

1. 把已完成汉化的模组整理到 `E:\自媒体 湫湫sims日志\功能模组` 的正确层级。
2. 打开项目最外层的 `作品信息.xlsx`，新增或修改对应记录。
3. 把完整 3:4 PNG 封面放入 `content/images`，在 Excel 的“封面路径”填写 `images/文件名.png`。
4. 保存并关闭 Excel，双击 `更新作品集.cmd`。

一键发布会依次检查日志目录与 Excel 是否一致、12 列结构和字段是否合法、封面是否存在且为精确 3:4、网站能否构建、JavaScript 语法是否正确。全部通过后才会提交和推送，并等待 GitHub Pages 部署完成。

只有状态为“已发布”的作品会出现在网站。百度网盘链接可以随时在 Excel 中更新；尚无地址时保留空白，不得编造。

## 手动检查

```text
python -m pip install -r requirements.txt
python tools/check_sync.py
python tools/preflight.py
```
