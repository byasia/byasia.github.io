# Asia的宝藏盒

[打开宝藏盒](https://byasia.github.io/) · [成品下载与源码](https://github.com/byasia/byasia.github.io/releases/tag/works-2026-11-01)

四个作品，四扇任意门。首页有可旋转的3D小岛、随机目的地、会回应的彩蛋按钮、实景相册和保存在浏览器本地的创作护照。

| 作品 | 打开作品 | 成品时间（上海） | 制作模型 |
| --- | --- | --- | --- |
| 真实世界 · 自由探索 4.3 | [进入世界](https://byasia.github.io/earth-universe/) | 2026-11-01 更新 | GPT-6.1 Sol |
| 爱背单词 2.7.0 | [网页体验](https://byasia.github.io/aibei/) · [Android安装包](https://github.com/byasia/byasia.github.io/releases/download/works-2026-11-01/aibei-2.7.0.apk) | 2026-10-20 交付 | GPT-6.1 Sol |
| 答案之书 | [翻开一页](https://byasia.github.io/answer-book/) | 2026-10-07 网页成品 | GPT-6.1 Sol（网页制作） |
| 晚风替我记得 | [开始阅读](https://byasia.github.io/wanfeng/) | 2026-10-07 网页成品 | GPT-6.1 Sol（网页制作） |

时间根据交付说明与仓库提交记录标注；模型根据创作会话记录标注。书籍的网页制作模型不代表原稿写作模型。[标注依据](source/provenance.json)。

## 游玩与学习

两款摸鱼小游戏可用手机或电脑浏览器打开。[小岛寻物局](https://byasia.github.io/island-hunt.html)用《真实世界》的三张实景出题，通关可领护照印章。[末班车多停了一站](https://byasia.github.io/last-train.html)是一篇可选路线的短故事，共有三个结局。

3D游戏推荐使用开启硬件加速的电脑浏览器。WASD移动，鼠标观察，F互动，Tab出行与工具，Esc暂停。首次进入需要载入三维资源；画质可在设置中调整。

英语网页版提供内置词汇、阅读、学习记录和星云探索。离线自然语音、实时新闻等原生功能使用Android安装版。AI识词、对话和谜案生成需要用户自己的DeepSeek API Key，服务商可能收费；本网站不提供共享Key。原签名安装包可覆盖安装，保留已有数据。

## 发布方式

网页源码与原有两本书保存在本仓库。两项新作品的生产构建、完整源码和APK保存在同仓库Release，避免大型三维模型、语音资源进入网页源码的提交历史。

GitHub Actions取出仓库内容，下载固定版本的两个网页构建包，校验SHA-256后组装四个作品并发布到GitHub Pages。更新网页内容后推送main会重新发布；更换新作品构建时需同步Release与工作流中的校验值。

首页无需框架构建，直接静态托管。小岛的可维护源文件见[source/island.mjs](source/island.mjs)，运行文件为island.js；使用Three.js，许可证保留在source目录。支持键盘、减少动态效果偏好及WebGL不可用时的四站导航。

《答案之书》保留1000页、随机翻页、收藏与分享；《晚风替我记得》的正文、插图和PDF采用PBKDF2与AES-GCM加密；输入阅读密码后在浏览器本地解密。支持重新上锁，刷新后需要再次输入密码；密码不保存在网页或浏览器存储中。解锁后保留12章、目录、搜索、阅读设置与PDF下载。

创作者 · Asia
