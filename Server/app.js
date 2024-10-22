const express = require('express');
const sql = require('mssql');

const app = express();
const cors = require('cors');
app.use(express.json());

app.use(cors());
const port = 3000;

const config = {
    user: 'LEQUOCBAO',
    password: 'fsd',
    server: '172.168.5.14\\SQL2008', // địa chỉ server
    database: 'LEQUOCBAO_TM229_A',
    options: {
        encrypt: false, // sử dụng mã hóa
        trustServerCertificate: true // chỉ nên dùng trong môi trường phát triển
    }
};

app.get('/api/data', async (req, res) => {
    try {
        // Kết nối đến cơ sở dữ liệu
        await sql.connect(config);
        const result = await sql.query`SELECT ma_vt, ten_vt, dvt, loai_vt FROM dmvt`;

        // Trả về dữ liệu dưới dạng JSON
        res.json(result.recordset);
    } catch (err) {
        console.error('SQL error', err);
        res.status(500).send('Lỗi khi truy cập cơ sở dữ liệu');
    }
});

app.listen(port, () => {
    console.log(`API đang chạy tại http://localhost:${port}`);
});

const jwt = require('jsonwebtoken');

// Thay thế secret_key bằng khóa bí mật của bạn
const secretKey = '9sdGxiqbAgyS31ktx+3Y3BpDh0';

// Hàm để tạo token
function generateToken(user) {
    // Payload chứa thông tin người dùng (có thể tùy chỉnh)
    const payload = {
        id: user.id,
        username: user.name,
    };

    // Thời gian hết hạn của token (tùy chọn)
    const options = {
        expiresIn: '24h', // Token sẽ hết hạn sau 24 giờ
    };

    // Tạo token
    return jwt.sign(payload, secretKey, options);
}

const CryptoJS = require('crypto-js');

// Hàm mã hóa MD5
function md5Encode(password) {
    return CryptoJS.MD5(password).toString(); // Mã hóa mật khẩu bằng MD5
}

// Hàm xử lý mật khẩu
function processPassword(password, key) {
    let sMD5 = md5Encode(password);
    
    // Thay đổi thứ tự các ký tự theo yêu cầu
    const newMD5 = key.substring(key.length - 1, key.length) +
                    sMD5.substring(1, sMD5.length - 1) +
                    key.substring(0, 1);
    return newMD5;
}

// Ví dụ khi người dùng đăng nhập
app.post('/api/login', async (req, res) => {
    const {username, password} = req.body;

    try { 
        await sql.connect(config);
        
        const result = await sql.query`SELECT id, name, comment, password, keys FROM vsysuserinfo WHERE name = ${username}`;
        
        if (result.recordset.length === 0) {
            return res.status(401).json({message: 'Tài khoản không tồn tại!' });
        }

        const user = result.recordset[0]; // Lấy thông tin người dùng đầu tiên

        // Xử lý mật khẩu nhập vào để so sánh
        const processedPassword = processPassword(password, user.keys);

        // Kiểm tra mật khẩu đã mã hóa
        if (processedPassword === user.password) {
            return res.json({message: 'Đăng nhập thành công!', token: generateToken(user)});
        } else {
            return res.status(401).json({message: 'Mật khẩu không chính xác!'});
        }
    } catch (err) {
        console.error('SQL error', err);
        return res.status(500).json({ message: 'Lỗi khi truy cập cơ sở dữ liệu' });
    }
});



