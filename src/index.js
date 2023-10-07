const express = require('express');
const ldap = require('ldapjs'); 
//const mysql = require('mysql');
const app = express();

app.use(express.json());



app.get('/', (req, res)=>{
       res.send("Node JS api")
})


app.post('/api/usuarios', async (req, res) => {
  const {
    name,
    lastname,
    email,
    password,
    dni,
    birthDate,
    gender,
    status
  } = req.body;

  if (!name || !lastname || !email || !password || !dni || !birthDate || !gender) {
    return res.status(400).send('Todos los campos son obligatorios.');
  }

  // Verificar si el CN ya existe
  const existingUsers = await searchUsuariosPorCN(name);

  if (existingUsers.length > 0) {
    return res.status(400).send('El CN ya está en uso por otro usuario.');
  }

  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'Str0ngLd4p5Pwd';

  const ldapClient = ldap.createClient({
    url: ldapServerUrl,
    tlsOptions: {}
  });

  ldapClient.bind(adminDN, adminPassword, (bindError) => {
    if (bindError) {
      console.error('Fallo al autenticarse en el servidor LDAP sin SSL:', bindError);
    } else {
      console.log('Conexión exitosa al servidor LDAP sin SSL');
    };

    const nuevoUsuarioLDAP = {
      objectClass: ['top', 'posixAccount', 'inetOrgPerson'],
      cn: name,
      sn: lastname,
      givenName: name,
      uid: email,
      userPassword: password,
      uidNumber: '1003',
      gidNumber: '501',
      homeDirectory: `/home/users/${email}`,
      loginShell: '/bin/bash',
      mail: email,
      postalCode: birthDate,
      carLicense: dni
    };

    ldapClient.add(`cn=${name} ${lastname},ou=users,dc=deliverar,dc=com`, nuevoUsuarioLDAP, (addError) => {
      if (addError) {
        console.error('Error al agregar usuario en el servidor LDAP:', addError);
        res.status(500).send('Error al agregar usuario en el servidor LDAP');
      } else {
        console.log('Usuario creado con éxito en el servidor LDAP');
        res.status(201).send('Usuario creado con éxito en el servidor LDAP');
      }
      ldapClient.unbind();
    });
  });
});


app.get('/api/GetAllUsuarios', (req, res) => {
  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'Str0ngLd4p5Pwd';

  
  const ldapClient = ldap.createClient({
    url: ldapServerUrl,
  });

 
  ldapClient.bind(adminDN, adminPassword, (bindError) => {
    if (bindError) {
      console.error('Fallo al autenticarse en el servidor LDAP:', bindError);
      res.status(500).send('Error al autenticarse en el servidor LDAP');
      return;
    }

    
    const baseDN = 'ou=users,dc=deliverar,dc=com';
    const searchOptions = {
      scope: 'one',
      filter: '(objectClass=*)',
    };

    ldapClient.search(baseDN, searchOptions, (searchError, searchResponse) => {
      if (searchError) {
        console.error('Error en la búsqueda LDAP:', searchError);
        res.status(500).send('Error en la búsqueda LDAP');
        return;
      }

      const usuarios = [];
      
      searchResponse.on('searchEntry', (entry) => {
        const usuario = entry.pojo;
        usuarios.push(usuario);
      });


      searchResponse.on('end', () => {
        console.log('Búsqueda LDAP completada. Total de usuarios encontrados:', usuarios.length);

        
        ldapClient.unbind();

        
        res.status(200).json(usuarios);
      });
    });
  });
});

app.get('/api/BuscarUsuariosPorCN', (req, res) => {
  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'Str0ngLd4p5Pwd';

  const ldapClient = ldap.createClient({
    url: ldapServerUrl,
  });

  ldapClient.bind(adminDN, adminPassword, (bindError) => {
    if (bindError) {
      console.error('Fallo al autenticarse en el servidor LDAP:', bindError);
      res.status(500).send('Error al autenticarse en el servidor LDAP');
      return;
    }

    const baseDN = 'ou=users,dc=deliverar,dc=com';
    const cn = req.query.cn; 
    const searchOptions = {
      scope: 'one',
      filter: `(cn=${cn})`, 
    };

    ldapClient.search(baseDN, searchOptions, (searchError, searchResponse) => {
      if (searchError) {
        console.error('Error en la búsqueda LDAP:', searchError);
        res.status(500).send('Error en la búsqueda LDAP');
        return;
      }

      const usuariosCN = [];

      searchResponse.on('searchEntry', (entry) => {
        const usuarioCN = entry.pojo;
        usuariosCN.push(usuarioCN);
      });

      searchResponse.on('end', () => {
        console.log('Búsqueda LDAP completada. Total de usuarios encontrados:', usuariosCN.length);

        ldapClient.unbind();

        res.status(200).json(usuariosCN);
      });
    });
  });
});

app.put('/api/usuarios/:cn', async (req, res) => {
  const cn = req.params.cn; 
  const {
    name,
    lastname,
    email,
    password,
    dni,
    birthDate,
    gender,
    status
  } = req.body;

  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'Str0ngLd4p5Pwd';

  const ldapClient = ldap.createClient({
    url: ldapServerUrl,
  });

  ldapClient.bind(adminDN, adminPassword, (bindError) => {
    if (bindError) {
      console.error('Fallo al autenticarse en el servidor LDAP:', bindError);
      res.status(500).send('Error al autenticarse en el servidor LDAP');
      return;
    }

    const modifyChanges = [
      new ldap.Change({
        operation: 'replace',
        modification: new ldap.Attribute({
          type: 'givenName',
          vals: [name],
        }),
      }),
      new ldap.Change({
        operation: 'replace',
        modification: new ldap.Attribute({
          type: 'sn',
          vals: [lastname],
        }),
      }),
      new ldap.Change({
        operation: 'replace',
        modification: new ldap.Attribute({
          type: 'uid',
          vals: [email],
        }),
      }),
      new ldap.Change({
        operation: 'replace',
        modification: new ldap.Attribute({
          type: 'userPassword',
          vals: [password],
        }),
      }),
      new ldap.Change({
        operation: 'replace',
        modification: new ldap.Attribute({
          type: 'postalCode',
          vals: [birthDate],
        }),
      }),
      new ldap.Change({
        operation: 'replace',
        modification: new ldap.Attribute({
          type: 'carLicense',
          vals: [dni],
        }),
      }),
    ];

    console.log('Contenido de modifyChanges:', modifyChanges);

    ldapClient.modify(`cn=${cn},ou=users,dc=deliverar,dc=com`, modifyChanges, (modifyError) => {
      if (modifyError) {
        console.error('Error al modificar usuario en el servidor LDAP:', modifyError);
        res.status(500).send('Error al modificar usuario en el servidor LDAP');
      } else {
        console.log('Usuario modificado con éxito en el servidor LDAP');
        res.status(200).send('Usuario modificado con éxito en el servidor LDAP');
      }
      ldapClient.unbind();
    });
  });
});


async function searchUsuariosPorCN(cn) {
  return new Promise((resolve, reject) => {
    const ldapServerUrl = 'ldap://34.231.51.201:389/';
    const adminDN = 'cn=admin,dc=deliverar,dc=com';
    const adminPassword = 'Str0ngLd4p5Pwd';

    const ldapClient = ldap.createClient({
      url: ldapServerUrl,
    });

    ldapClient.bind(adminDN, adminPassword, (bindError) => {
      if (bindError) {
        console.error('Fallo al autenticarse en el servidor LDAP:', bindError);
        reject(bindError);
      } else {
        const baseDN = 'ou=users,dc=deliverar,dc=com';
        const searchOptions = {
          scope: 'one',
          filter: `(cn=${cn})`,
        };

        ldapClient.search(baseDN, searchOptions, (searchError, searchResponse) => {
          if (searchError) {
            console.error('Error en la búsqueda LDAP:', searchError);
            reject(searchError);
          }

          const usuariosCN = [];

          searchResponse.on('searchEntry', (entry) => {
            const usuarioCN = entry.pojo;
            usuariosCN.push(usuarioCN);
          });

          searchResponse.on('end', () => {
            console.log('Búsqueda LDAP completada. Total de usuarios encontrados:', usuariosCN.length);
            ldapClient.unbind();
            resolve(usuariosCN);
          });
        });
      }
    });
  });
}

app.get('/api/Login', (req, res) => {
  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'Str0ngLd4p5Pwd';

  const ldapClient = ldap.createClient({
    url: ldapServerUrl,
  });

  ldapClient.bind(adminDN, adminPassword, (bindError) => {
    if (bindError) {
      console.error('Fallo al autenticarse en el servidor LDAP:', bindError);
      res.status(500).send('Error al autenticarse en el servidor LDAP');
      return;
    }

    const baseDN = 'ou=users,dc=deliverar,dc=com';
    const cn = req.query.cn; 
    const dn = "cn=" + cn + ",ou=users,dc=deliverar,dc=com";
    const pass = req.query.pass;
    console.log(cn);
    console.log(dn);
    ldapClient.bind(dn, pass, (err) => {
      if (err) {
        console.error('Error de autenticación:', err);
        res.status(500).send('Credenciales Invalidas');
        return;
      }
          console.log('Autenticación exitosa');
          ldapClient.unbind();
          res.status(200).send('ok');
    })
  });
});

app.put('/api/ChangePassword', (req, res) => {
  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'Str0ngLd4p5Pwd';

  const ldapClient = ldap.createClient({
    url: ldapServerUrl,
  });

  ldapClient.bind(adminDN, adminPassword, (bindError) => {
    if (bindError) {
      console.error('Fallo al autenticarse en el servidor LDAP:', bindError);
      res.status(500).send('Error al autenticarse en el servidor LDAP');
      return;
    }

    const baseDN = 'ou=users,dc=deliverar,dc=com';
    const cn = req.query.cn; 
    const dn = "cn=" + cn + ",ou=users,dc=deliverar,dc=com";
    const newPass = req.query.pass;
    console.log(cn);
    console.log(dn);

    const change = new ldap.Change({
      operation: 'replace',
      modification: {
        type: 'userPassword',
        vals: [newPass],
      },
    })

    ldapClient.modify(dn, change, (modifyError) => {
      if (modifyError) {
        console.error('Error al cambiar la contraseña:', modifyError);
        return;
      }  
      console.log('Contraseña cambiada exitosamente');
  
      // Desconexión del servidor LDAP
      ldapClient.unbind();
    });
      ldapClient.unbind();
    });
});



const port= process.env.port || 80
app.listen(port,()=> console.log(`Escuchando en puerto ${port}...`))

/*const db = mysql.createConnection({
  host: '127.0.0.1', 
  user: 'root', 
  database: 'DELIVERAR'
});


db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySql:', err);
  } else {
    console.log('Successfully connected to MySql');
  }
});

app.get('/', (req, res) => {
    res.send('Server is listening');
  });


app.listen(3000, () => {
  console.log('server is listening on port', 3000);
});
*/
