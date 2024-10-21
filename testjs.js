let configuration={
userdb: "postgres",
host: '190.113.174.89',
db: "nextcloud",
pass: "NlkrPlr7HnUy4Wg",
port: 8306,      
}

async function login(email, password, callback) {
    const { Client } = require('pg');
    var user;
    async function consultBD() {
        let config = {
            user: configuration.userdb,
            host: '190.113.174.89',
            database: configuration.bd,
            password: configuration.pass,
            port: 8306,
        }
        console.log(config)
        const client = new Client(config);
        try {
            // Consultar a la BD PostgreSQL
            console.log("conectando");
            await client.connect().then(e=>console.log("connect"));
            const result = await client.query("SELECT * FROM usuarios WHERE email = $1;", [email]);
            console.log(result.rows);
            if (result.rows.length === 0) return callback(null, new WrongUsernameOrPasswordError(email));
            user = result.rows[0];
        } catch (error) {
            console.log(error)
            return callback(error);
        } finally {
            await client.end();
        }

        bcrypt.compare(password, user.password, function (err, isValid) {
            if (err || !isValid) return callback(err || new WrongUsernameOrPasswordError(email));

            return callback(null, {
                user_id: user.id,
                nickname: user.username,
                email: user.email
            });
        });
    }
    await consultBD();
}

login("test@test.cl","12345",e=>(e))

var ping = require('ping');

var hosts = ['192.168.1.1', 'google.com'];
hosts.forEach(function(host){
    ping.sys.probe(host, function(isAlive){
        var msg = isAlive ? 'host ' + host + ' is alive' : 'host ' + host + ' is dead';
        console.log(msg);
    });
});