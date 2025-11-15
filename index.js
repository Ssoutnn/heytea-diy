#!/usr/bin/env node

const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const net = require('net');

const app = express();
const PORT = process.env.PORT || 5969;
axios.defaults.timeout = 300000; // 设置全局请求超时时间为300秒


// 检测端口是否可用的函数
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close();
      resolve(true);
    });
    server.on('error', () => {
      resolve(false);
    });
  });
}

// 查找可用端口的函数
async function findAvailablePort(startPort, maxPort = startPort + 100) {
  for (let port = startPort; port <= maxPort; port++) {
    if (await checkPort(port)) {
      return port;
    }
  }
  throw new Error(`无法在 ${startPort} 到 ${maxPort} 范围内找到可用端口`);
}


app.use(cors());
app.use(express.json());

// multer 配置
// 使用内存存储，不保存到磁盘
const storage = multer.memoryStorage();
const upload = multer({ storage });

// 托管 Vue 静态文件
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// 简单的健康检查
app.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'heytea backend running' });
});

// 添加请求代理接口
app.post('/express/api', async (req, res) => {
  try {
    const data = req.body;
    const url = 'https://app-go.heytea.com' + data.url;
    const method = data.method || 'POST';
    const headers = data.headers || {};
    const params = data.param || {};
    const body = data.body || {};

    let response = await axios({
        method: method,
        url: url, 
        headers: headers,
        data: body,
        params: params
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('API Proxy Error:', error);
    res.status(500).json({ 
      error: 'Proxy request failed', 
      message: error.message 
    });
  }
});

// 添加新的上传接口，用于代理上传到heytea服务
app.post('/express/upload', upload.fields([{ name: 'file', maxCount: 1 }]), async (req, res) => {
  try {
    // 获取表单数据
    const { width, height, sign, t, token } = req.body;
    
    // 检查必需参数
    if (!req.files || !req.files.file || !sign || !t || !token) {
      return res.status(400).json({ 
        code: 1, 
        message: 'Missing required parameters' 
      });
    }

    const file = req.files.file[0];
    const url = `https://app-go.heytea.com/api/service-cps/user/diy?sign=${sign}&t=${t}`;
    const headers = { 
      'Authorization': token 
    };

    // 构造 FormData
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', file.buffer, {
      filename: `${t}.png`,
      contentType: 'image/png'
    });
    form.append('width', width);
    form.append('height', height);

    // 发送请求
    const response = await axios.post(url, form, {
      headers: {
        ...headers,
        ...form.getHeaders()
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Upload Proxy Error:', error);
    res.status(500).json({ 
      code: 1, 
      error: 'Upload proxy failed', 
      message: error.message 
    });
  }
});

// 刷新页面避免 404（Vue 路由为 history 模式时需配置）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});


// 启动逻辑
async function startServer() {
  try {
    // 首先检查默认端口是否可用
    if (await checkPort(PORT)) {
      app.listen(PORT, () => {
        console.log("\n\n\n")
        console.log(`👉👉👉请在浏览器中访问 http://localhost:${PORT}`);
        console.log("\n")
        console.log(`->>>>please open in browser http://localhost:${PORT}`);
        console.log("\n\n")
        console.log(`>>>>>>>>>>请勿关闭此窗口`);
        console.log("\n")
        console.log(`->>>>please don't close this window`);
        console.log("\n\n\n")
      });
    } else {
      // 如果默认端口被占用，寻找下一个可用端口
      console.log(`端口 ${PORT} 已被占用，正在寻找可用端口...`);
      const availablePort = await findAvailablePort(PORT + 1);
      app.listen(availablePort, () => {
        console.log("\n\n\n")
        console.log(`👉👉👉请在浏览器中访问 http://localhost:${availablePort}`);
        console.log("\n")
        console.log(`->>>>please open in browser http://localhost:${availablePort}`);
        console.log("\n\n")
        console.log(`>>>>>>>>>>请勿关闭此窗口`);
        console.log("\n")
        console.log(`->>>>please don't close this window`);
        console.log("\n\n\n")
      });
    }
  } catch (error) {
    console.error('启动服务器失败:', error.message);
    process.exit(1);
  }
}
startServer();
