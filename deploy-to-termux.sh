#!/bin/bash
# 工厂产量系统 - Termux 一键部署脚本
# 使用方法：在 Termux 中运行：bash deploy-to-termux.sh

echo "=========================================="
echo "  工厂产量系统 - Termux 部署脚本"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否在 Termux 中
if [ -z "$TERMUX_VERSION" ] && [ -z "$TERMUX_API_VERSION" ]; then
    echo -e "${YELLOW}警告：未检测到 Termux 环境${NC}"
    echo "此脚本专为 Termux (Android) 设计"
    read -p "是否继续？ (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 1. 更新包列表
echo -e "\n${GREEN}[1/8] 更新包列表...${NC}"
pkg update -y

# 2. 安装必要软件
echo -e "\n${GREEN}[2/8] 安装 Node.js、Git 和 OpenSSH...${NC}"
pkg install -y nodejs git openssh

# 3. 创建项目目录
echo -e "\n${GREEN}[3/8] 创建项目目录...${NC}"
PROJECT_DIR="$HOME/factory-system"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# 4. 克隆或复制项目文件
echo -e "\n${GREEN}[4/8] 准备项目文件...${NC}"
echo -e "${YELLOW}请将 factory-backend 文件夹复制到：${NC}"
echo -e "${YELLOW}$PROJECT_DIR/${NC}"
echo ""
echo "复制方法："
echo "1. 用数据线连接电脑和手机"
echo "2. 把 factory-backend 文件夹复制到手机存储"
echo "3. 在 Termux 中运行："
echo "   cp -r /sdcard/factory-backend $PROJECT_DIR/"
echo ""
read -p "准备好后按回车继续..."

# 检查项目是否存在
if [ ! -d "$PROJECT_DIR/factory-backend" ]; then
    echo -e "${RED}错误：未找到 factory-backend 文件夹${NC}"
    echo "请确保已将项目文件复制到正确位置"
    exit 1
fi

# 5. 安装依赖
echo -e "\n${GREEN}[5/8] 安装 Node.js 依赖...${NC}"
cd $PROJECT_DIR/factory-backend
npm install

# 6. 初始化数据库
echo -e "\n${GREEN}[6/8] 初始化数据库...${NC}"
npm run init-db 2>/dev/null || node scripts/initDb.js

# 7. 创建启动脚本
echo -e "\n${GREEN}[7/8] 创建启动脚本...${NC}"
cat > $PROJECT_DIR/start-server.sh << 'EOF'
#!/bin/bash
cd $HOME/factory-system/factory-backend
echo "=========================================="
echo "  启动工厂产量系统服务器"
echo "=========================================="
echo ""
echo "本地访问地址："
echo "  http://localhost:3001"
echo ""
# 获取本机IP
IP=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1)
if [ ! -z "$IP" ]; then
    echo "局域网访问地址："
    echo "  http://$IP:3001"
fi
echo ""
echo "按 Ctrl+C 停止服务器"
echo "=========================================="
node server.js
EOF
chmod +x $PROJECT_DIR/start-server.sh

# 8. 安装 cpolar
echo -e "\n${GREEN}[8/8] 安装 cpolar...${NC}"
echo -e "${YELLOW}注意：cpolar 需要单独安装${NC}"
echo ""
echo "方法一：下载 cpolar Android 版"
echo "  访问：https://www.cpolar.com/download"
echo "  下载 Android ARM 版本"
echo ""
echo "方法二：Termux 中安装"
echo "  1. 下载：wget https://static.cpolar.com/downloads/releases/3.3.12/cpolar-stable-linux-arm.zip"
echo "  2. 解压：unzip cpolar-stable-linux-arm.zip"
echo "  3. 授权：chmod +x cpolar"
echo "  4. 移动：mv cpolar $PREFIX/bin/"
echo ""

# 创建 cpolar 启动脚本
cat > $PROJECT_DIR/start-cpolar.sh << 'EOF'
#!/bin/bash
echo "启动 cpolar 内网穿透..."
echo "需要先配置 authtoken：cpolar authtoken <your-token>"
echo ""
cpolar http 3001
EOF
chmod +x $PROJECT_DIR/start-cpolar.sh

# 完成
echo ""
echo "=========================================="
echo -e "${GREEN}  部署完成！${NC}"
echo "=========================================="
echo ""
echo "项目位置：$PROJECT_DIR"
echo ""
echo "常用命令："
echo "  启动服务器：bash $PROJECT_DIR/start-server.sh"
echo "  启动穿透： bash $PROJECT_DIR/start-cpolar.sh"
echo ""
echo "现在可以启动服务器了："
echo "  bash $PROJECT_DIR/start-server.sh"
echo ""
