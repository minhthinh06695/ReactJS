const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const sql = require('mssql');

const app = express();
app.use(cors());
app.use(express.json());

const config = {
    user: 'VIAGS_FE',
    password: 'fsd',
    server: '172.168.5.14\\SQL2008', // địa chỉ server
    database: 'VIAGS_FE_SP229_A',
    options: {
        encrypt: false, // sử dụng mã hóa
        trustServerCertificate: true // chỉ nên dùng trong môi trường phát triển
    }
};

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../fbo-app/build')));

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


app.get('/api/getPdfInv', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const id = req.query.id;

        const result = await pool.request()
            .query(`SELECT data as file_data FROM hoadon68_pdf WHERE hoadon68_id = '${id}'`); // Thay đổi câu truy vấn phù hợp

        if (result.recordset.length > 0) {
            const fileData = result.recordset[0].file_data;
            res.setHeader('Content-Type', 'application/pdf');
            res.send(fileData);
        } else {
            res.status(404).json({ error: 'File không tìm thấy' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi truy xuất dữ liệu' });
    }
});

app.get('/api/getInvdata', async (req, res) => {
    try {
        // Kết nối đến cơ sở dữ liệu
        await sql.connect(config);
        const result = await sql.query`exec dbo.zrs_aits$Load$InvOutput '20210101', null, '', 1, 1`;

        // Trả về dữ liệu dưới dạng JSON
        res.json(result.recordset);
    } catch (err) {
        console.error('SQL error', err);
        res.status(500).send('Lỗi khi truy cập cơ sở dữ liệu');
    }
});


// Handle all other routes for React
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../fbo-app/build', 'index.html'));
});

const jwt = require('jsonwebtoken');

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`API đang chạy tại http://localhost:${port}`);
});

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

function processPassword(password, key) {
    let sMD5 = md5Encode(password);

    const newMD5 = key.substring(key.length - 1, key.length) +
        sMD5.substring(1, sMD5.length - 1) +
        key.substring(0, 1);

    return newMD5;
}

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        await sql.connect(config);

        const result = await sql.query`SELECT id, name, comment, password, keys FROM vsysuserinfo WHERE name = ${username}`;

        if (result.recordset.length === 0) {
            return res.status(401).json({ message: 'Tài khoản không tồn tại!' });
        }

        const user = result.recordset[0]; // Lấy thông tin người dùng đầu tiên

        // Xử lý mật khẩu nhập vào để so sánh
        const processedPassword = processPassword(password, user.keys);

        // Kiểm tra mật khẩu đã mã hóa
        if (processedPassword === user.password) {
            return res.json({ message: 'Đăng nhập thành công!', token: generateToken(user), comment: user.comment});
        } else {
            return res.status(401).json({ message: 'Mật khẩu không chính xác!' });
        }
    } catch (err) {
        console.error('SQL error', err);
        return res.status(500).json({ message: 'Lỗi khi truy cập cơ sở dữ liệu' });
    }
});



