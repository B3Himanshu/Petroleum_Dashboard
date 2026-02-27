#!/bin/bash

# Local testing script - Test deployment on your local machine
# No server needed! Perfect for Windows with WSL or Linux/Mac

echo "🧪 Local Testing Setup"
echo "======================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Nginx not found. Installing...${NC}"
    
    # Detect OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            sudo apt update
            sudo apt install -y nginx
        elif command -v yum &> /dev/null; then
            sudo yum install -y nginx
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install nginx
        else
            echo "Please install Homebrew first: https://brew.sh"
            exit 1
        fi
    else
        echo "Please install nginx manually for your OS"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Nginx installed${NC}"

# Build frontend
echo -e "\n${BLUE}Building frontend...${NC}"
cd frontend
npm install
echo "VITE_API_URL=http://localhost:3001/api" > .env.production
npm run build
cd ..

# Create test directory
TEST_DIR="/tmp/petroleum-test"
mkdir -p "$TEST_DIR/frontend"
cp -r frontend/dist/* "$TEST_DIR/frontend/"

# Create simple nginx config for local testing
cat > /tmp/nginx-test.conf << EOF
server {
    listen 8080;
    server_name localhost;
    
    root $TEST_DIR/frontend;
    index index.html;
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

# Test nginx config
if sudo nginx -t -c /tmp/nginx-test.conf 2>/dev/null; then
    echo -e "${GREEN}✓ Nginx config valid${NC}"
    echo -e "\n${GREEN}✅ Setup complete!${NC}"
    echo ""
    echo "To test:"
    echo "1. Start backend: cd backend && npm start"
    echo "2. Start nginx with test config: sudo nginx -c /tmp/nginx-test.conf"
    echo "3. Open browser: http://localhost:8080"
else
    echo -e "${YELLOW}Note: Nginx config test requires sudo${NC}"
    echo "You can manually test by:"
    echo "1. Start backend: cd backend && npm start"
    echo "2. Serve frontend: cd frontend/dist && python -m http.server 8080"
    echo "3. Open: http://localhost:8080"
fi

