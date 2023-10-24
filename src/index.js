const express = require('express');
const ldap = require('ldapjs');
const nodemailer = require("nodemailer");
//const mysql = require('mysql');
const app = express();
const cors = require('cors');
const crypto = require('crypto');
const brevo = require('@getbrevo/brevo');


app.use(cors()); // Esto permitirá todas las solicitudes CORS

app.use(express.json());



app.get('/', (req, res) => {
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
  const adminPassword = 'admin';

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
  const adminPassword = 'admin';


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
  const adminPassword = 'admin';

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
  const adminPassword = 'admin';

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
          values: [name],
        }),
      }),
      new ldap.Change({
        operation: 'replace',
        modification: new ldap.Attribute({
          type: 'sn',
          values: [lastname],
        }),
      }),
      new ldap.Change({
        operation: 'replace',
        modification: new ldap.Attribute({
          type: 'uid',
          values: [email],
        }),
      }),
      new ldap.Change({
        operation: 'replace',
        modification: new ldap.Attribute({
          type: 'userPassword',
          values: [password],
        }),
      }),
      new ldap.Change({
        operation: 'replace',
        modification: new ldap.Attribute({
          type: 'postalCode',
          values: [birthDate],
        }),
      }),
      new ldap.Change({
        operation: 'replace',
        modification: new ldap.Attribute({
          type: 'carLicense',
          values: [dni],
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






app.get('/api/LoginUidApp', async (req, res) => {
  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'admin';

  const ldapClient = ldap.createClient({
    url: ldapServerUrl,
  });

  ldapClient.bind(adminDN, adminPassword, async (bindError) => {
    if (bindError) {
      console.error('Fallo al autenticarse en el servidor LDAP:', bindError);
      res.status(500).send('Error al autenticarse en el servidor LDAP');
      return;
    }


    const uid = req.query.uid;
    const pass = req.query.pass;
    const applicacion = req.query.app;
    console.log(uid);
    try {
      const usuarioDN = await searchUsuariosPorUid(uid);
      console.log('DN del usuario:', usuarioDN);
      const bloqueado = await estaBloqueado(usuarioDN);
      console.log("bloqueado??: ", bloqueado)
      if (bloqueado === '1') {
        return res.status(500).send('Usuario Bloqueado');
      }
      ldapClient.bind(usuarioDN, pass, (err) => {
        if (err) {
          console.error('Error de autenticación:', err);
          incrementAndCheckStAndL(usuarioDN);
          res.status(500).send('Credenciales Inválidas');
          return;
        }
        console.log('Autenticación exitosa');
        blanquearContador(usuarioDN);
        ldapClient.unbind();
        res.status(200).send('ok');
      });
    } catch (searchError) {
      console.error('Error en la búsqueda LDAP:', searchError);
      res.status(500).send('No se encontró el usuario en e LDAP');
    }
  });
});









app.get('/api/LoginUid', async (req, res) => {
  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'admin';

  const ldapClient = ldap.createClient({
    url: ldapServerUrl,
  });

  ldapClient.bind(adminDN, adminPassword, async (bindError) => {
    if (bindError) {
      console.error('Fallo al autenticarse en el servidor LDAP:', bindError);
      res.status(500).send('Error al autenticarse en el servidor LDAP');
      return;
    }


    const uid = req.query.uid;
    const pass = req.query.pass;
    console.log(uid);
    try {
      const usuarioDN = await searchUsuariosPorUid(uid);
      console.log('DN del usuario:', usuarioDN);
      const bloqueado = await estaBloqueado(usuarioDN);
      console.log("bloqueado??: ", bloqueado)
      if (bloqueado === '1') {
        return res.status(500).send('Usuario Bloqueado');
      }
      ldapClient.bind(usuarioDN, pass, (err) => {
        if (err) {
          console.error('Error de autenticación:', err);
          incrementAndCheckStAndL(usuarioDN);
          res.status(500).send('Credenciales Inválidas');
          return;
        }
        console.log('Autenticación exitosa');
        blanquearContador(usuarioDN);
        ldapClient.unbind();
        res.status(200).send('ok');
      });
    } catch (searchError) {
      console.error('Error en la búsqueda LDAP:', searchError);
      res.status(500).send('No se encontró el usuario en e LDAP');
    }
  });
});



app.get('/api/Login', (req, res) => {
  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'admin';

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

/* CHANGE PASSWORD SIN CRYPTO
app.put('/api/ChangePassword', async (req, res) => {
  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'admin';

  const ldapClient = ldap.createClient({
    url: ldapServerUrl,
  });

  ldapClient.bind(adminDN, adminPassword, async (bindError) => {
    if (bindError) {
      console.error('Fallo al autenticarse en el servidor LDAP:', bindError);
      res.status(500).send('Error al autenticarse en el servidor LDAP');
      return;
    }
    const uid = req.query.uid;
    console.log(uid);
    const newPass = req.query.pass;
    console.log(newPass);
    try {
      const usuarioDN = await searchUsuariosPorUid(uid);
      console.log('DN del usuario:', usuarioDN);
      const change = new ldap.Change({
        operation: 'replace',
        modification: new ldap.Attribute({
          type: 'userPassword',
          values: [newPass],
        }),
      });

      ldapClient.modify(usuarioDN, change, (modifyError) => {
        if (modifyError) {
          console.error('Error al cambiar la contraseña:', modifyError);
          // Asegúrate de manejar el error de cambio de contraseña de manera adecuada
          res.status(500).send('Error al cambiar la contraseña');
          return;
        }
        console.log('Contraseña cambiada exitosamente');

        // Desconexión del servidor LDAP
        ldapClient.unbind();
        res.status(200).send('Contraseña cambiada exitosamente');
      });
    } catch (searchError) {
      console.error('Error en la búsqueda LDAP:', searchError);
      res.status(500).send('No se encontró el usuario en e LDAP');
    }
    // Configurar la modificación de la contraseña

  });
});

*/

app.put('/api/ChangePassword', async (req, res) => {
  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'admin';

  const ldapClient = ldap.createClient({
    url: ldapServerUrl,
  });

  ldapClient.bind(adminDN, adminPassword, async (bindError) => {
    if (bindError) {
      console.error('Fallo al autenticarse en el servidor LDAP:', bindError);
      res.status(500).send('Error al autenticarse en el servidor LDAP');
      return;
    }
    const uid = req.query.uid;
    console.log(uid);
    const newPass = req.query.pass;
    console.log(newPass);

    // Calcular el hash MD5 de la nueva contraseña
    const sha1Password = crypto.createHash('sha1').update(newPass).digest('base64');
    const sha1 = "{SHA}" + sha1Password

    try {
      const usuarioDN = await searchUsuariosPorUid(uid);
      console.log('DN del usuario:', usuarioDN);
      const change = new ldap.Change({
        operation: 'replace',
        modification: new ldap.Attribute({
          type: 'userPassword',
          values: [sha1], // Usar el hash MD5
        }),
      });
      console.log("contraseña hasheada: ", sha1)
      ldapClient.modify(usuarioDN, change, (modifyError) => {
        if (modifyError) {
          console.error('Error al cambiar la contraseña:', modifyError);
          // Asegúrate de manejar el error de cambio de contraseña de manera adecuada
          res.status(500).send('Error al cambiar la contraseña');
          return;
        }
        console.log('Contraseña cambiada exitosamente');

        // Desconexión del servidor LDAP
        ldapClient.unbind();
        res.status(200).send('Contraseña cambiada exitosamente');
      });
    } catch (searchError) {
      console.error('Error en la búsqueda LDAP:', searchError);
      res.status(500).send('No se encontró el usuario en el LDAP');
    }
  });
});

app.get('/api/ValidarOTP', async (req, res) => {
  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'admin';

  const ldapClient = ldap.createClient({
    url: ldapServerUrl,
  });

  ldapClient.bind(adminDN, adminPassword, async (bindError) => {
    if (bindError) {
      console.error('Fallo al autenticarse en el servidor LDAP:', bindError);
      res.status(500).send('Error al autenticarse en el servidor LDAP');
      return;
    }
    const uid = req.query.uid;
    const otp = req.query.otp;
    console.log(uid);
    const usuarioDN = await searchUsuariosPorUid(uid);
    console.log(usuarioDN);

    // Obtener el valor del atributo "EmployeeNumber" del usuario
    ldapClient.compare(usuarioDN, 'employeeNumber', otp, (compareError, matched) => {
      if (compareError) {
        console.error('Error al comparar el atributo "EmployeeNumber(OTP)":', compareError);
        res.status(500).send('Error al validar el OTP');
        ldapClient.unbind(); // Asegurar que se cierre la conexión en caso de error
        return;
      }

      if (matched) {
        console.log('OTP IGUALES');
        ldapClient.modify(usuarioDN, new ldap.Change({
          operation: 'replace',
          modification: new ldap.Attribute({
            type: 'employeeNumber',
            values: [],
          }),
        }), (modifyError) => {
          if (modifyError) {
            console.error('Error al borrar el atributo "EmployeeNumber":', modifyError);
            res.status(500).send('Error al borrar el atributo "EmployeeNumber"');
          } else {
            console.log('Atributo "EmployeeNumber" borrado exitosamente');
            res.status(200).send('1');
          }
          ldapClient.unbind(); // Cerrar la conexión después de modificar el atributo
        });
      } else {
        console.log('NO SON IGUALES');
        res.status(400).send('NO SON IGUALES');
        ldapClient.unbind(); // Cerrar la conexión en caso de no coincidencia
      }
    });
  });
});



app.put('/api/GenerarOTP', async (req, res) => {
  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'admin';

  const ldapClient = ldap.createClient({
    url: ldapServerUrl,
  });


  ldapClient.bind(adminDN, adminPassword, async (bindError) => {
    if (bindError) {
      console.error('Fallo al autenticarse en el servidor LDAP:', bindError);
      res.status(500).send('Error al autenticarse en el servidor LDAP');
      return;
    }
    const uid = req.query.uid;
    const givenName = req.query.name;
    console.log(uid);

    try {
      const codigo = CodigoRandom();
      sendEmailBrevo(codigo, uid, givenName).catch(console.error);
      const usuarioDN = await searchUsuariosPorUid(uid);
      console.log('DN del usuario:', usuarioDN);
      const change = new ldap.Change({
        operation: 'replace',
        modification: new ldap.Attribute({
          type: 'employeeNumber',
          values: [codigo],
        }),
      });

      ldapClient.modify(usuarioDN, change, (modifyError) => {
        if (modifyError) {
          console.error('Error cargar el OTP:', modifyError);
          // Asegúrate de manejar el error de cambio de contraseña de manera adecuada
          res.status(500).send('Error al cargar el OTP');
          return;
        }
        console.log('OTP generado exitosamente');

        // Desconexión del servidor LDAP
        ldapClient.unbind();
        res.status(200).json(codigo);
      });
    } catch (searchError) {
      console.error('Error en la búsqueda LDAP:', searchError);
      res.status(500).send('No se encontró el usuario en e LDAP');
    }
    // Configurar la modificación de la contraseña

  });
});





app.put('/api/DesbloquearUsuario', async (req, res) => {
  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'admin';

  const ldapClient = ldap.createClient({
    url: ldapServerUrl,
  });


  ldapClient.bind(adminDN, adminPassword, async (bindError) => {
    if (bindError) {
      console.error('Fallo al autenticarse en el servidor LDAP:', bindError);
      res.status(500).send('Error al autenticarse en el servidor LDAP');
      return;
    }
    const uid = req.query.uid;
    const givenName = req.query.name;
    console.log(uid);

    try {
      const usuarioDN = await searchUsuariosPorUid(uid);
      console.log('DN del usuario:', usuarioDN);
      const change = new ldap.Change({
        operation: 'replace',
        modification: new ldap.Attribute({
          type: 'l',
          values: ["0"],
        }),
      });

      ldapClient.modify(usuarioDN, change, (modifyError) => {
        if (modifyError) {
          console.error('Error al desbloquear el usuario:', modifyError);
          // Asegúrate de manejar el error de cambio de contraseña de manera adecuada
          res.status(500).send('Error al desbloquear el usuario');
          return;
        }
        console.log('Usuario desbloqueado correctamente');

        // Desconexión del servidor LDAP
        ldapClient.unbind();
        res.status(200).send('Usuario desbloqueado correctamente');
      });
    } catch (searchError) {
      console.error('Error en la búsqueda LDAP:', searchError);
      res.status(500).send('No se encontró el usuario en e LDAP');
    }
    // Configurar la modificación de la contraseña

  });
});




app.get('/api/BuscarUsuariosPorUid', (req, res) => {
  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'admin';

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
    const uid = req.query.uid;
    const searchOptions = {
      scope: 'one',
      filter: `(uid=${uid})`,
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

app.get('/api/ValidarEmail', (req, res) => {
  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'admin';

  const ldapClient = ldap.createClient({
    url: ldapServerUrl,
  });

  ldapClient.bind(adminDN, adminPassword, async (bindError) => {
    if (bindError) {
      console.error('Fallo al autenticarse en el servidor LDAP:', bindError);
      res.status(500).send('Error al autenticarse en el servidor LDAP');
      return;
    }
    const nombre = req.query.name;
    const existingUsers = await searchUsuariosPorUid(nombre);

    if (existingUsers.length > 0) {
      return res.status(200).send("1");
      /* return res.status(500).send('El usuario no existe.');*/
      /*VER QUE ES NECESARIO QUE DEVUELVA*/

    } else {
      res.status(500).send('El usuario no existe.');
    }
    ldapClient.unbind();

  });
});



// app.post('/api/usuarios/:cn/asignar-grupos', async (req, res) => {
//   const cn = req.params.cn;
//   const { groups } = req.body;

//   const ldapServerUrl = 'ldap://34.231.51.201:389/';
//   const adminDN = 'cn=admin,dc=deliverar,dc=com';
//   const adminPassword = 'admin';

//   const ldapClient = ldap.createClient({
//     url: ldapServerUrl,
//   });

//   ldapClient.bind(adminDN, adminPassword, async (bindError) => {
//     if (bindError) {
//       console.error('Fallo al autenticarse en el servidor LDAP:', bindError);
//       res.status(500).send('Error al autenticarse en el servidor LDAP');
//       return;
//     }

//     const userDN = `cn=${cn},ou=users,dc=deliverar,dc=com`;

//     // Recorre la lista de grupos y asigna al usuario
//     for (const groupDN of groups) {
//       ldapClient.modify(userDN, [
//         new ldap.Change({
//           operation: 'add',
//           modification: new ldap.Attribute({
//             type: 'member', // Nombre del atributo que relaciona usuarios y grupos
//             vals: [userDN], // Valor que relaciona al usuario con el grupo
//           }),
//         }),
//       ], (modifyError) => {
//         if (modifyError) {
//           console.error(`Error al asignar el usuario al grupo ${groupDN}:`, modifyError);
//         } else {
//           console.log(`Usuario asignado al grupo ${groupDN}`);
//         }
//       });
//     }

//     console.log(`Grupos asignados al usuario ${cn}:`, groups); // Nuevo console.log agregado

//     res.status(200).send('Grupos asignados exitosamente');
//     ldapClient.unbind();
//   });
// });

// app.post('/api/usuarios/:cn/desasignar-grupos', async (req, res) => {
//   const cn = req.params.cn;
//   const { groups } = req.body;

//   const ldapServerUrl = 'ldap://34.231.51.201:389/';
//   const adminDN = 'cn=admin,dc=deliverar,dc=com';
//   const adminPassword = 'admin';

//   const ldapClient = ldap.createClient({
//     url: ldapServerUrl,
//   });

//   ldapClient.bind(adminDN, adminPassword, async (bindError) => {
//     if (bindError) {
//       console.error('Fallo al autenticarse en el servidor LDAP:', bindError);
//       res.status(500).send('Error al autenticarse en el servidor LDAP');
//       return;
//     }

//     const userDN = `cn=${cn},ou=users,dc=deliverar,dc=com`;

//     // Recorre la lista de grupos y desasigna al usuario
//     for (const groupDN of groups) {
//       ldapClient.modify(groupDN, [
//         new ldap.Change({
//           operation: 'delete',
//           modification: new ldap.Attribute({
//             type: 'member', // Nombre del atributo que relaciona usuarios y grupos
//             vals: [userDN], // Valor que se eliminará del grupo
//           }),
//         }),
//       ], (modifyError) => {
//         if (modifyError) {
//           console.error(`Error al desasignar el usuario del grupo ${groupDN}:`, modifyError);
//         } else {
//           console.log(`Usuario desasignado del grupo ${groupDN}`);
//         }
//       });
//     }

//     res.status(200).send('Grupos desasignados exitosamente');
//     ldapClient.unbind();
//   });
// });


// Función para listar grupos en LDAP
async function listarGrupos() {
  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'admin';

  const ldapClient = ldap.createClient({
    url: ldapServerUrl,
  });

  ldapClient.bind(adminDN, adminPassword, (bindError) => {
    if (bindError) {
      console.error('Fallo al autenticarse en el servidor LDAP:', bindError);
      throw bindError; // Manejar el error de autenticación
    } else {
      console.log('Conexión exitosa al servidor LDAP');
    }

    const baseDN = 'ou=groups,dc=deliverar,dc=com'; // Reemplaza con tu DN de grupos
    const searchOptions = {
      scope: 'one',
      filter: '(objectClass=posixGroup)', // Filtro para grupos (ajusta según tu LDAP)
    };

    return new Promise((resolve, reject) => {
      ldapClient.search(baseDN, searchOptions, (searchError, searchResponse) => {
        if (searchError) {
          console.error('Error en la búsqueda LDAP:', searchError);
          ldapClient.unbind();
          reject(searchError); // Manejar el error de búsqueda
        }

        const grupos = [];

        searchResponse.on('searchEntry', (entry) => {
          const grupo = entry.object;
          grupos.push(grupo);
        });

        searchResponse.on('end', () => {
          console.log('Búsqueda LDAP completada. Total de grupos encontrados:', grupos.length);
          ldapClient.unbind();
          resolve(grupos);
        });
      });
    });
  });
}

// // Ruta para obtener la lista de grupos
// app.get('/api/listar-grupos', async (req, res) => {
//   try {
//     const grupos = await listarGrupos();
//     res.status(200).json({ grupos });
//   } catch (error) {
//     res.status(500).json({ error: 'Error al listar grupos' });
//   }
// });



app.put('/api/AgregarUsuariosGrupo', async (req, res) => {

  // Autenticación del administrador en el servidor LDAP
  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'admin';

  const ldapClient = ldap.createClient({
    url: ldapServerUrl,
  });
  const grp = req.query.grupo;
  const usuario = req.query.usr;
  const grupoDN = 'cn=' + grp + ',ou=groups,dc=deliverar,dc=com';
  console.log(usuario);
  console.log(grupoDN);


  ldapClient.bind(adminDN, adminPassword, (bindErr) => {
    if (bindErr) {
      ldapClient.unbind();
      return res.status(401).json({ error: 'Error de autenticación LDAP' });
    }

    // Modificación para agregar el usuario al grupo
    const change = new ldap.Change({
      operation: 'add',
      modification: new ldap.Attribute({
        type: 'memberUid',
        values: [usuario],
      }),
    });

    ldapClient.modify(grupoDN, change, (modifyErr) => {
      ldapClient.unbind();
      if (modifyErr) {
        return res.status(500).json({ error: 'Error al agregar el usuario al grupo' });
      }

      res.status(200).json({ message: `Usuario '${usuario}' agregado al grupo.` });
    });
  });
});

app.delete('/api/EliminarUsuariosGrupo', async (req, res) => {
  // Autenticación del administrador en el servidor LDAP
  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'admin';

  const ldapClient = ldap.createClient({
    url: ldapServerUrl,
  });
  const grp = req.query.grupo;
  const usuario = req.query.usr;
  const grupoDN = 'cn=' + grp + ',ou=groups,dc=deliverar,dc=com';

  ldapClient.bind(adminDN, adminPassword, (bindErr) => {
    if (bindErr) {
      ldapClient.unbind();
      return res.status(401).json({ error: 'Error de autenticación LDAP' });
    }

    // Modificación para eliminar el usuario del grupo
    const change = new ldap.Change({
      operation: 'delete',
      modification: new ldap.Attribute({
        type: 'memberUid',
        values: [usuario],
      }),
    });

    ldapClient.modify(grupoDN, change, (modifyErr) => {
      ldapClient.unbind();
      if (modifyErr) {
        return res.status(500).json({ error: 'Error al eliminar el usuario del grupo' });
      }

      res.status(200).json({ message: `Usuario '${usuario}' eliminado del grupo.` });
    });
  });
});


/*

app.post("/api/asignar-usuarios-a-grupo", (req, res) => {
  // Recupera los datos del usuario y del grupo desde el cuerpo de la solicitud
  const { username, groupName } = req.body;
  console.log("username:", username);
  console.log("groupName:", groupName);

  // Configura los detalles de conexión al servidor LDAP
  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'admin';

  const ldapClient = ldap.createClient({
    url: ldapServerUrl,
  });

  // Conecta al servidor LDAP
  ldapClient.bind(adminDN, adminPassword, (bindErr) => {
    if (bindErr) {
      console.error("Error al conectar al servidor LDAP:", bindErr);
      return res.status(500).json({ error: "Error de conexión al servidor LDAP" });
    }

    // Define la base de búsqueda para el grupo
    const groupDN = `cn=${groupName},ou=groups,dc=deliverar,dc=com`;
    const userDN = `cn=${username},ou=users,dc=deliverar,dc=com`;
    console.log("groupDN:", groupDN);
    console.log("userDN:", userDN);

    // Realiza una búsqueda para verificar si el usuario existe
    ldapClient.search(userDN, { scope: "sub" }, (searchErr, userRes) => {
      if (searchErr) {
        console.error("Error al buscar el usuario:", searchErr);
        ldapClient.unbind();
        return res.status(500).json({ error: "Error al buscar el usuario en el servidor LDAP" });
      }

      userRes.on("searchEntry", (entry) => {
        console.log("User Entry:", entry.object);
        // Verifica que el usuario exista antes de continuar
        if (entry) {
          // Realiza una búsqueda para verificar si el grupo existe
          ldapClient.search(groupDN, { scope: "base" }, (groupSearchErr, groupRes) => {
            if (groupSearchErr) {
              console.error("Error al buscar el grupo:", groupSearchErr);
              ldapClient.unbind();
              return res.status(500).json({ error: "Error al buscar el grupo en el servidor LDAP" });
            }

            groupRes.on("searchEntry", (groupEntry) => {
              console.log("Group Entry:", groupEntry.object);
              // Verifica que el grupo exista antes de continuar
              if (groupEntry) {
                // La propiedad 'memberUid' se refiere a los miembros actuales del grupo
                const group = groupEntry.object;

                if (group && group.memberUid) {
                  console.log("Miembros actuales del grupo:", group.memberUid);

                  // Verifica si el usuario ya es miembro del grupo
                  if (group.memberUid.indexOf(userDN) === -1) {
                    // Agrega al usuario al grupo
                    group.memberUid.push(userDN);
                    console.log("Miembros del grupo después de la adición:", group.memberUid);

                    // Actualiza el grupo con el nuevo usuario
                    ldapClient.modify(groupDN, [
                      new ldap.Change({
                        operation: 'replace',
                        modification: {
                          memberUid: group.memberUid,
                        },
                      }),
                    ], (modifyErr) => {
                      if (modifyErr) {
                        console.error("Error al modificar el grupo:", modifyErr);
                        ldapClient.unbind();
                        return res.status(500).json({ error: "Error al modificar el grupo en el servidor LDAP" });
                      }

                      // Cierra la conexión al servidor LDAP
                      ldapClient.unbind();

                      return res.json({ message: `Usuario ${username} asignado al grupo ${groupName} con éxito.` });
                    });
                  } else {
                    console.log(`El usuario ${username} ya es miembro del grupo ${groupName}.`);
                    ldapClient.unbind();
                    return res.json({ message: `Usuario ${username} ya es miembro del grupo ${groupName}.` });
                  }
                } else {
                  console.error("La propiedad 'memberUid' del grupo no está definida.");
                  ldapClient.unbind();
                  return res.status(500).json({ error: "La propiedad 'memberUid' del grupo no está definida." });
                }
              }
            });
          });
        } else {
          console.error(`El usuario ${username} no existe.`);
          ldapClient.unbind();
          return res.status(404).json({ error: `El usuario ${username} no existe en el servidor LDAP.` });
        }
      });
    });
  });
});

*/



app.get('/api/validarAplicacion', async (req, res) => {

  const grupoCN = req.query.cn;
  const usuario = req.query.uid;
  const grupos = await UsuarioEnGrupo(grupoCN, usuario);
  if (grupos === "1") {
    res.status(200).send("Puedes acceder a la aplicación");
  } else {
    res.status(500).send("no podes acceder a esta aplicación");
  }

});



app.get("/api/grupos-ldap", (req, res) => {
  // Configura los detalles de conexión al servidor LDAP
  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'admin';

  const ldapClient = ldap.createClient({
    url: ldapServerUrl,
  });
  // Conecta al servidor LDAP
  ldapClient.bind(adminDN, adminPassword, (err) => {
    if (err) {
      console.error("Error al conectar al servidor LDAP:", err);
      return res.status(500).json({ error: "Error de conexión al servidor LDAP" });
    }

    // Define la base de búsqueda y filtros
    const searchBase = "ou=groups,dc=deliverar,dc=com"; // Reemplaza con tu OU
    const searchFilter = "(objectClass=*)"; // Ajusta el filtro según tus necesidades

    // Configura las opciones de búsqueda
    const searchOptions = {
      scope: "one", // Puedes ajustar el alcance de búsqueda (sub, base, one)
      filter: searchFilter,
    };

    // Realiza la búsqueda en el servidor LDAP
    ldapClient.search(searchBase, searchOptions, (searchErr, searchRes) => {
      if (searchErr) {
        console.error("Error al realizar la búsqueda:", searchErr);
        ldapClient.unbind();
        return res.status(500).json({ error: "Error de búsqueda en el servidor LDAP" });
      }

      const groups = [];

      // Procesa los resultados de la búsqueda
      searchRes.on("searchEntry", (entry) => {
        const group = entry.pojo;
        groups.push(group);
      });

      searchRes.on("end", () => {
        // Cierra la conexión al servidor LDAP
        ldapClient.unbind();

        // Devuelve los grupos como JSON
        return res.json(groups);
      });
    });
  });
});

app.get("/api/usuarios-de-grupo/:groupName", (req, res) => {
  const groupName = req.params.groupName;

  // Configuración de conexión al servidor LDAP
  const ldap = require('ldapjs');
  const ldapServerUrl = 'ldap://34.231.51.201:389';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'admin';
  const searchBase = 'ou=groups,dc=deliverar,dc=com'; // Ajusta la base según tu estructura LDAP

  // Crea un cliente LDAP
  const ldapClient = ldap.createClient({
    url: ldapServerUrl,
  });

  // Autenticación del cliente
  ldapClient.bind(adminDN, adminPassword, (bindErr) => {
    if (bindErr) {
      console.error("Error al autenticar el cliente LDAP:", bindErr);
      return res.status(500).json({ error: "Error de autenticación al servidor LDAP" });
    }

    console.log("Cliente LDAP autenticado correctamente.");

    // Filtro para buscar el grupo específico
    const searchFilter = `(cn=${groupName})`;

    // Configura las opciones de búsqueda
    const searchOptions = {
      scope: "sub", // Ajusta el alcance de búsqueda según tu estructura LDAP
      filter: searchFilter,
    };

    console.log("Realizando búsqueda en el servidor LDAP...");

    // Realiza la búsqueda en el servidor LDAP para obtener el grupo
    ldapClient.search(searchBase, searchOptions, (searchErr, searchRes) => {
      if (searchErr) {
        console.error("Error al realizar la búsqueda en el servidor LDAP:", searchErr);
        ldapClient.unbind();
        return res.status(500).json({ error: "Error de búsqueda en el servidor LDAP" });
      }

      let groupMembers = [];

      // Procesa los resultados de la búsqueda para obtener los miembros del grupo
      searchRes.on("searchEntry", (entry) => {
        const groupEntry = entry.object;
        groupMembers = groupEntry.memberUid || [];
      });

      searchRes.on("end", () => {
        if (groupMembers.length === 0) {
          console.log("No se encontraron miembros en el grupo.");
          ldapClient.unbind();
          return res.json([]); // Devuelve una lista vacía si no hay miembros en el grupo.
        }

        console.log(`Miembros encontrados en el grupo "${groupName}":`, groupMembers);

        // Ahora, construye un filtro de búsqueda para los miembros del grupo
        const userSearchFilter = `(|${groupMembers.map((userName) => `(uid=${userName})`).join('')})`;

        const userSearchOptions = {
          scope: "sub", // Ajusta el alcance de búsqueda según tu estructura LDAP
          filter: userSearchFilter,
        };

        // Realiza una nueva búsqueda para obtener los usuarios que son miembros del grupo
        ldapClient.search(searchBase, userSearchOptions, (userSearchErr, userSearchRes) => {
          if (userSearchErr) {
            console.error("Error al buscar usuarios del grupo:", userSearchErr);
            ldapClient.unbind();
            return res.status(500).json({ error: "Error al buscar usuarios del grupo" });
          }

          const users = [];

          // Procesa los resultados de la búsqueda de usuarios
          userSearchRes.on("searchEntry", (userEntry) => {
            const user = userEntry.object;
            users.push(user);
          });

          userSearchRes.on("end", () => {
            // Cierra la conexión al servidor LDAP
            ldapClient.unbind();

            console.log("Búsqueda en el servidor LDAP finalizada. Usuarios encontrados:", users.length);

            // Devuelve los usuarios como JSON
            return res.json(users);
          });
        });
      });
    });
  });
});







app.get("/api/GruposDelUsuario", (req, res) => {
  // Configura los detalles de conexión al servidor LDAP
  const ldapServerUrl = 'ldap://34.231.51.201:389/';
  const adminDN = 'cn=admin,dc=deliverar,dc=com';
  const adminPassword = 'admin';

  const ldapClient = ldap.createClient({
    url: ldapServerUrl,
  });
  // Conecta al servidor LDAP
  const uid = req.query.uid;
  ldapClient.bind(adminDN, adminPassword, (err) => {
    if (err) {
      console.error("Error al conectar al servidor LDAP:", err);
      return res.status(500).json({ error: "Error de conexión al servidor LDAP" });
    }

    // Define la base de búsqueda y filtros
    const searchBase = "ou=groups,dc=deliverar,dc=com"; // Reemplaza con tu OU
    const searchOptions = {
      scope: 'one',
      filter: `(memberUid=${uid})`,
    };

    // Realiza la búsqueda en el servidor LDAP
    ldapClient.search(searchBase, searchOptions, (searchErr, searchRes) => {
      if (searchErr) {
        console.error("Error al realizar la búsqueda:", searchErr);
        ldapClient.unbind();
        return res.status(500).json({ error: "Error de búsqueda en el servidor LDAP" });
      }

      const groups = [];

      // Procesa los resultados de la búsqueda
      searchRes.on("searchEntry", (entry) => {
        const group = entry.pojo;
        groups.push(group);
      });

      searchRes.on("end", () => {
        // Cierra la conexión al servidor LDAP
        ldapClient.unbind();

        // Devuelve los grupos como JSON
        return res.json(groups);
      });
    });
  });
});

async function searchUsuariosPorCN(cn) {
  return new Promise((resolve, reject) => {
    const ldapServerUrl = 'ldap://34.231.51.201:389/';
    const adminDN = 'cn=admin,dc=deliverar,dc=com';
    const adminPassword = 'admin';

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



async function sendEmailBrevo(otp, uid, givenName) {

  let defaultClient = brevo.ApiClient.instance;
  let apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = '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';
  const apiInstance = new brevo.TransactionalEmailsApi();
  const sendSmtpEmail = new brevo.SendSmtpEmail();

  // Configurar el correo electrónico (puedes personalizarlo según tus necesidades)
  sendSmtpEmail.subject = "Deliverar - código de validación";
  sendSmtpEmail.htmlContent = `
  <html>
    <head>
      <style>
        /* Estilos para el branding 
        .header {
          background-color: #0073e6;
          color: #ffffff; 
          padding: 10px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Deliverar</h1>
      </div>
      <p>Estimado/a ${givenName},</p>
      <p>Le informamos que hemos recibido una solicitud de cambio de contraseña para su cuenta en Deliverar.</p>
      <p>Si usted no ha solicitado este cambio, por favor póngase en contacto con nuestro servicio de asistencia técnica.</p>
      <p>Para continuar con el proceso de cambio de contraseña, utilice el siguiente código OTP: <strong>${otp}</strong></p>
      <p>Gracias por confiar en Deliverar.</p>
      <p>Atentamente,<br>El Equipo de Soporte de Deliverar</p>
    </body>
  </html>
`;
  sendSmtpEmail.sender = { "name": "DeliverarLDAP", "email": "abmpersonalinternodeliverar@gmail.com" };
  sendSmtpEmail.to = [
    { "email": uid, "name": "sample-name" }
  ];
  sendSmtpEmail.headers = { "Some-Custom-Name": "unique-id-1234" };
  sendSmtpEmail.params = { "parameter": "My param value", "subject": "common subject" };

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('API called successfully. Returned data: ' + JSON.stringify(data));
    return data;
  } catch (error) {
    console.error(error);
    throw new Error('Error al enviar el correo electrónico');
  }
}

// Ruta para enviar correos electrónicos
app.post('/sendEmail', async (req, res) => {
  try {
    const result = await sendEmail();
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




async function sendEmail(otp, uid, givenName) {
  // Configura el transporte de correo con Ethereal
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  // Define el correo electrónico
  const mailOptions = {
    from: "remite@example.com", // La dirección de correo electrónico del remitente
    to: `${uid}`, // La dirección de correo electrónico del destinatario
    subject: "Deliverar",
    html: `
    <html>
      <head>
        <style>
          /* Estilos para el branding 
          .header {
            background-color: #0073e6;
            color: #ffffff; 
            padding: 10px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Deliverar</h1>
        </div>
        <p>Estimado/a ${givenName},</p>
        <p>Le informamos que hemos recibido una solicitud de cambio de contraseña para su cuenta en Deliverar.</p>
        <p>Si usted no ha solicitado este cambio, por favor póngase en contacto con nuestro servicio de asistencia técnica.</p>
        <p>Para continuar con el proceso de cambio de contraseña, utilice el siguiente código OTP: <strong>${otp}</strong></p>
        <p>Gracias por confiar en Deliverar.</p>
        <p>Atentamente,<br>El Equipo de Soporte de Deliverar</p>
      </body>
    </html>
  `, // Puedes cambiar a HTML si necesitas contenido HTML
  };

  // Envía el correo electrónico
  const info = await transporter.sendMail(mailOptions);

  console.log("Correo electrónico enviado con éxito. URL de vista previa:", nodemailer.getTestMessageUrl(info));
}



function searchUsuariosPorUid(uid) {
  return new Promise((resolve, reject) => {
    const ldapServerUrl = 'ldap://34.231.51.201:389/';
    const adminDN = 'cn=admin,dc=deliverar,dc=com';
    const adminPassword = 'admin';

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
          filter: `(uid=${uid})`,
        };

        let usuarioEncontrado = false; // Bandera para rastrear si se encontró un usuario

        ldapClient.search(baseDN, searchOptions, (searchError, searchResponse) => {
          if (searchError) {
            console.error('Error en la búsqueda LDAP:', searchError);
            reject(searchError);
          }

          searchResponse.on('searchEntry', (entry) => {
            const usuarioDN = entry.dn.toString(); // Obtiene el DN del usuario
            resolve(usuarioDN);
            usuarioEncontrado = true; // Marca que se encontró un usuario
          });

          searchResponse.on('end', () => {
            console.log('Búsqueda LDAP completada');
            ldapClient.unbind();

            if (!usuarioEncontrado) {
              resolve(new Error(`No se encontró un usuario con el UID: ${uid}`));
            }
          });
        });
      }
    });
  });
}



function CodigoRandom() {
  const min = 100000; // Valor mínimo de 6 dígitos
  const max = 999999; // Valor máximo de 6 dígitos
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


function estaBloqueado(dn) {
  return new Promise((resolve, reject) => {
    const ldapServerUrl = 'ldap://34.231.51.201:389/';
    const adminDN = 'cn=admin,dc=deliverar,dc=com';
    const adminPassword = 'admin';

    const ldapClient = ldap.createClient({
      url: ldapServerUrl,
    });

    ldapClient.bind(adminDN, adminPassword, (bindErr) => {
      if (bindErr) {
        ldapClient.unbind(() => {
          reject(bindErr);
        });
        return;
      }

      const searchOptions = {
        scope: 'base',
        attributes: ['l'],
      };
      ldapClient.search(dn, searchOptions, (searchErr, res) => {
        if (searchErr) {
          ldapClient.unbind(() => {
            reject(searchErr);
          });
          return;
        }

        res.on('searchEntry', (entry) => {
          console.log('PASO 1 de busqueda del l');
          const lValue = entry.attributes.find(attr => attr.type === 'l').values[0];
          console.log('Valor de "l": ', lValue);
          if (lValue == '1') {
            resolve(lValue);
          } else {
            resolve(null);
          }
        });
        res.on('end', () => {
          ldapClient.unbind(() => {
          });
        });
      });
    });
  });
};

function incrementAndCheckStAndL(dn) {
  return new Promise((resolve, reject) => {
    const ldapServerUrl = 'ldap://34.231.51.201:389/';
    const adminDN = 'cn=admin,dc=deliverar,dc=com';
    const adminPassword = 'admin';

    const ldapClient = ldap.createClient({
      url: ldapServerUrl,
    });

    ldapClient.bind(adminDN, adminPassword, (bindErr) => {
      if (bindErr) {
        ldapClient.unbind(() => {
          reject(bindErr);
        });
        return;
      }

      const searchOptions = {
        scope: 'base',
        attributes: ['st'],
      };
      ldapClient.search(dn, searchOptions, (searchErr, res) => {
        if (searchErr) {
          ldapClient.unbind(() => {
            reject(searchErr);
          });
          return;
        }

        res.on('searchEntry', (entry) => {
          console.log('PASO 1');
          const stValue = entry.attributes.find(attr => attr.type === 'st').values[0];
          console.log('Valor de "st": ', stValue);
          const newSt = stValue + 1;
          console.log('St nuevo:', newSt);
          const change = new ldap.Change({
            operation: 'replace',
            modification: new ldap.Attribute({
              type: 'st',
              values: [newSt],
            }),
          });
          // Realiza la modificación en el servidor LDAP
          ldapClient.modify(dn, change, () => {
            console.log("Se actualizó el contador");
          });
          console.log("VALOR DE NEWST: ", newSt)
          if (newSt == '0111') {
            console.log("PASO 3");
            const bloqueo = "1";
            console.log("bloqueo: ", bloqueo)
            const lChange = new ldap.Change({
              operation: 'replace',
              modification: new ldap.Attribute({
                type: 'l',
                values: [bloqueo],
              }),
            });
            console.log("PASO 4");
            ldapClient.modify(dn, lChange, (modifyErr) => {
              console.log("Se  bloqueó el usuario");
              resolve("1");
            });
          }
        });
        res.on('end', () => {
          ldapClient.unbind(() => {
            resolve('Operación completada con éxito.');
          });
        });
      });
    });
  });
}


function blanquearContador(dn) {
  return new Promise((resolve, reject) => {
    const ldapServerUrl = 'ldap://34.231.51.201:389/';
    const adminDN = 'cn=admin,dc=deliverar,dc=com';
    const adminPassword = 'admin';

    const ldapClient = ldap.createClient({
      url: ldapServerUrl,
    });

    ldapClient.bind(adminDN, adminPassword, (bindErr) => {
      if (bindErr) {
        ldapClient.unbind(() => {
          reject(bindErr);
        });
        return;
      }

      const searchOptions = {
        scope: 'base',
        attributes: ['st'],
      };
      ldapClient.search(dn, searchOptions, (searchErr, res) => {
        if (searchErr) {
          ldapClient.unbind(() => {
            reject(searchErr);
          });
          return;
        }

        res.on('searchEntry', (entry) => {
          const newSt = 0;
          console.log('St nuevo:', newSt);
          const change = new ldap.Change({
            operation: 'replace',
            modification: new ldap.Attribute({
              type: 'st',
              values: [newSt],
            }),
          });
          // Realiza la modificación en el servidor LDAP
          ldapClient.modify(dn, change, () => {
            console.log("Se reinició el contador");
          });
        });
        res.on('end', () => {
          ldapClient.unbind(() => {
            resolve('Operación completada con éxito.');
          });
        });
      });
    });
  });
}




function UsuarioEnGrupo(groupCN, uid) {
  return new Promise((resolve, reject) => {
    const ldapServerUrl = 'ldap://34.231.51.201:389/';
    const adminDN = 'cn=admin,dc=deliverar,dc=com';
    const adminPassword = 'admin';

    const ldapClient = ldap.createClient({
      url: ldapServerUrl,
    });

    ldapClient.bind(adminDN, adminPassword, (bindErr) => {
      if (bindErr) {
        ldapClient.unbind();
        reject(bindErr);
        return;
      }

      const searchOptions = {
        scope: 'one',
        filter: `&(cn=${groupCN})(memberUid=${uid})`,
      };
      const baseDN = 'ou=groups,dc=deliverar,dc=com';
      ldapClient.search(baseDN, searchOptions, (searchErr, searchResult) => {
        if (searchErr) {
          ldapClient.unbind();
          reject(searchErr);
          return;
        }

        searchResult.on('searchEntry', (entry) => {
          // El usuario está en el grupo si se encuentra una entrada.
          ldapClient.unbind(() => {
            resolve("1");
          });
        });

        searchResult.on('end', () => {
          ldapClient.unbind(() => {
            resolve("0"); // El usuario no se encontró en el grupo
          });
        });
      });
    });
  });
}



const port = process.env.port || 80
app.listen(port, () => console.log(`Escuchando en puerto ${port}...`))

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
