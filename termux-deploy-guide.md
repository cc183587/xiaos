# 废旧手机部署工厂产量系统 - 完整指南

## 一、准备工作

### 1. 手机要求
- Android 5.0 以上
- 至少 2GB 内存
- 存储空间 500MB 以上

### 2. 安装 Termux
从 F-Droid 下载（推荐）：
- 访问 https://f-droid.org/packages/com.termux/
- 下载并安装

> ⚠️ 不要用 Google Play 版，已经停止维护

---

## 二、快速部署（一键脚本）

### 1. 复制项目到手机
用数据线连接电脑和手机：
```
电脑上的 factory-backend 文件夹
    ↓ 复制到
手机存储/Download/factory-backend
```

### 2. 运行部署脚本
在 Termux 中执行：

```bash
# 更新软件源
pkg update -y

# 安装 git（用于下载脚本）
pkg install -y git

# 下载部署脚本
cd ~
git clone https://github.com/your-repo/factory-system.git
# 或者手动复制 deploy-to-termux.sh 到手机

# 运行脚本
bash deploy-to-termux.sh
```

---

## 三、手动部署（如果脚本失败）

### 1. 安装必要软件
```bash
pkg update -y
pkg install -y nodejs git openssh
```

### 2. 复制项目文件
```bash
# 创建项目目录
mkdir -p ~/factory-system

# 从手机存储复制（假设你放到了 Download）
cp -r /sdcard/Download/factory-backend ~/factory-system/

# 进入目录
cd ~/factory-system/factory-backend
```

### 3. 安装依赖
```bash
npm install
```

### 4. 初始化数据库
```bash
node scripts/initDb.js
```

### 5. 启动服务器
```bash
node server.js
```

看到 `Server running on port 3001` 就成功了！

---

## 四、内网穿透（cpolar）

### 1. 注册 cpolar
访问 https://dashboard.cpolar.com/signup 注册账号

### 2. 获取 authtoken
登录后，在 "验证" 页面复制你的 authtoken

### 3. 安装 cpolar（Termux 中）
```bash
# 下载
cd ~
wget https://static.cpolar.com/downloads/releases/3.3.12/cpolar-stable-linux-arm.zip

# 解压
pkg install -y unzip
unzip cpolar-stable-linux-arm.zip

# 移动到可执行目录
chmod +x cpolar
mv cpolar $PREFIX/bin/

# 配置 authtoken（替换为你的）
cpolar authtoken xxxxxxxxxxxxxxxxxx
```

### 4. 启动穿透
```bash
# 穿透本地 3001 端口
cpolar http 3001
```

会看到类似：
```
Forwarding  http://xxxxx.cpolar.top -> http://localhost:3001
```

这个 `http://xxxxx.cpolar.top` 就是外网访问地址！

---

## 五、后台运行（不挂 Termux）

### 方法1：使用 termux-services
```bash
# 安装
cd ~/factory-system/factory-backend
npm install -g pm2

# 用 pm2 启动
pm2 start server.js --name factory
pm2 save
pm2 startup
```

### 方法2：使用 nohup
```bash
cd ~/factory-system/factory-backend
nohup node server.js > server.log 2>&1 &

# 查看日志
tail -f server.log
```

---

## 六、开机自启

### 1. 创建启动脚本
```bash
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/start-factory.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
cd ~/factory-system/factory-backend
node server.js > server.log 2>&1 &
EOF
chmod +x ~/.termux/boot/start-factory.sh
```

### 2. 安装 Termux:API
```bash
pkg install -y termux-api
```

### 3. 允许自启
手机设置 → 应用 → Termux → 电池 → 允许后台运行

---

## 七、常见问题

### 1. npm install 很慢/失败
```bash
# 换淘宝镜像
npm config set registry https://registry.npmmirror.com
npm install
```

### 2. 端口被占用
```bash
# 查看占用
lsof -i :3001

# 杀掉进程
kill -9 <PID>
```

### 3. 数据库权限错误
```bash
# 给数据库目录权限
chmod -R 755 ~/factory-system/factory-backend/database
```

### 4. Termux 被杀后台
- 手机设置 → 电池优化 → Termux → 不优化
- 最近任务 → 锁定 Termux

---

## 八、备份数据

数据库文件位置：
```
~/factory-system/factory-backend/database/factory.db
```

备份命令：
```bash
cp ~/factory-system/factory-backend/database/factory.db /sdcard/Download/factory-backup-$(date +%Y%m%d).db
```

---

## 九、更新系统

```bash
cd ~/factory-system/factory-backend

# 拉取更新（如果用 git）
git pull

# 或者重新复制文件后
npm install

# 重启服务器
pm2 restart factory
```

---

## 十、外网访问地址

部署完成后，你可以：

| 访问方式 | 地址 |
|---------|------|
| 手机本机 | http://localhost:3001 |
| 局域网 | http://手机IP:3001 |
| 外网（穿透后） | http://xxxxx.cpolar.top |

---

**搞定！你的废旧手机现在是一个完整的服务器了 🎉**
