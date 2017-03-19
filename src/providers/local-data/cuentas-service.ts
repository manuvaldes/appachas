import {Events, Platform} from 'ionic-angular';
import {Storage} from '@ionic/storage';
import {Injectable} from '@angular/core';
import {CuentaLocalBean, CuentaRemotaBean, UsuarioLocalBean, GastoLocalBean, GastoRemotoBean} from './beans'
import {GapiService} from '../gapi-data/gapi-data'
import {Helper} from '../../app/helper'
import 'rxjs/add/operator/map';

//import {NuevaCuentaPage} from '../../pages/nueva-cuenta/nueva-cuenta';
//import {ListPage} from '../../pages/list/list';

/*
  Generated class for the LocalData provider.

  See https://angular.io/docs/ts/latest/guide/dependency-injection.html
  for more info on providers and Angular 2 DI.
    */
  @Injectable()
  export class CuentasService {
    // inicializamos a null para que si se reinicia el servicio, podamos distinguirlo
    // de array vacio y se fuerce una recarga desde sqllite

    cuentas: Array<CuentaLocalBean> = null;
  //  cuentasLocales: Array<CuentaLocalBean> = null;
  usuarioLocal: UsuarioLocalBean = null;

  storage: Storage;





  cuentaAbierta: string = null;
  gastosCache: Array<{ cuentaId: string, gastos: Array<GastoLocalBean> }> = [];

    // este array no va a ir al storage, sino que se calcula solo en memoria

    balances: Array<{
      nombre: string, email: string,
      balanceTotal: number,
      subBalances:
      Array<{
        nombre: string, email: string,
        balance: number
      }>
    }> = [];


    constructor(public platform: Platform, public gapiService: GapiService, public events: Events) {

      this.storage = new Storage();

    // el catch devuelve una promesa, asi que en caso de fallo el then espera al catch.
    // en caso de que se resuelva el then coge la primera promesa

    this.getUsuarioLocal("ultimo")
    .then(() => {
      this.getCuentasLocal()
      .then(() => {
        Helper.log("Publicando evento cuentas:created ");
        this.events.publish('cuentas:created');
      })
    });

    // en paralelo hacemos el remoto

    gapiService.initGapi()
    .catch((err) => {
      Helper.log("Negociar usuario: error en sign in " + err);
    })
    .then(() => {
      var clave;
      if (gapiService.loggedIn) {
        clave = gapiService.email;
        return this.getUsuarioLocal(clave);
      }
    })
    .then(() => {
        // en usuario tenemos el usuario Local, en usuarioRemoto el remoto
        if (!this.usuarioLocal || !this.usuarioLocal.email) {
          this.usuarioLocal = new UsuarioLocalBean();
          if (!gapiService.loggedIn || gapiService.email == "") {
            Helper.log("Negociar usuario: no hay usuario local ni remoto: creamos default");
            // no hay usuario local            
            this.usuarioLocal.email = "default";
            this.usuarioLocal.nombre = "Yo";
          }
          else {
            // no hay usuario local pero si remoto            
            this.usuarioLocal.email = gapiService.email;
            this.usuarioLocal.nombre = "Yo";
          }
        }
        return this.putUsuario(this.usuarioLocal);
      })
    .then(() => {
      return this.forcedGetCuentas();
    });
  }


  signIn(immediate: boolean) {

    this.gapiService.signin(immediate)
    .catch((err) => {
      Helper.log("Negociar usuario: error en sign in " + err);
      return Promise.resolve()
    })
    .then(() => {
      if (this.gapiService.loggedIn) {
        if (this.gapiService.email !== this.usuarioLocal.email) {
          return this.getUsuarioLocal(this.gapiService.email)
          .then((user) => {
            return this.putUsuario(this.usuarioLocal);
          });
        }
      }
    })
    .then(() => {
      return this.forcedGetCuentas();
    });
  }


    // devuelve una Promesa que resuelve a Usuario
    getUsuarioLocal(clave: string) {
    // si usuario ya está informado, devolvemos el objeto
    // si no vamos a buscarlo a la base de datos
    // lo devolvemos en una promise para que el tipo sea compatible
    // con todos los retornos posibles
    if (this.usuarioLocal != null && (this.usuarioLocal.email == clave || clave == "ultimo" || clave == "default")) {
      Helper.log("CuentasService: acceso a SQL ahorrado");
      return Promise.resolve(this.usuarioLocal);
    }

    return this.storage.get("usuario:" + clave)
    .then((usuario) => {
      Helper.log("getUsuario() then: recuperado el usuario local " + JSON.stringify(usuario));
      this.usuarioLocal = JSON.parse(usuario);
      return Promise.resolve(this.usuarioLocal);
    }).catch((err) => {
      Helper.log("getUsuario() catch: Error al recuperar usuario " + err);
      this.usuarioLocal = null;
      return Promise.resolve(null);
    });
  }

    // devuelve una promesa
    putUsuario(usuario: UsuarioLocalBean) {
    //no esperamos por la escritura de ultimo
    this.storage.set("usuario:ultimo", JSON.stringify(usuario)).then((result) => {
      Helper.log("ACCESO A SQL:putUsuario() then: guardado el usuario ultimo como " + usuario.email);
    });

    return this.storage.set("usuario:" + usuario.email, JSON.stringify(usuario))
    .then((result) => {
      Helper.log("ACCESO A SQL putUsuario() then: guardado el usuario local " + usuario.email);
    })
    .catch((error) => {
      Helper.log("ACCESO A SQL putUsuario() catch: fallo al guardar el usuario local con error " + JSON.stringify(error));
    });

  }


    // devuelve uan promesa
    getCuentas() {

    // si cuentas ya está informado, devolvemos el array
    // si no vamos a buscarlo a la base de datos
    // lo devolvemos en una promise para que el tipo sea compatible
    // con todos los retornos posibles
    if (this.cuentas != null) {
      Helper.log("CuentasService: acceso a SQL ahorrado");
      return Promise.resolve(this.cuentas);
    }

    return this.forcedGetCuentas();

  }


  forcedGetCuentas() {

    return this.getCuentasLocal()
    .then(() => {
      return this.gapiService.getCuentas(this.usuarioLocal.email)
      .catch((resp) => {
        Helper.log("getCuentas: no se encuentra el usuario remoto, lo registramos");
        return this.gapiService.insertarUsuario(this.usuarioLocal)
      });
    })
    .then((result) => {
        // Aqui deberiamos tener  tanto el array local como el remoto
        return this.actualizarCuentas();
      })
    .catch((error) => {
      Helper.log("Error en forcedGetCuentas " + error);
      return Promise.reject(error);
    });
  }


  getCuentasLocal() {

    return this.storage.get("cuentas:" + this.usuarioLocal.email)
    .then((cuentas) => {
      if (!cuentas || cuentas === '') {
        this.cuentas = [];
      }
      else {
        this.cuentas = JSON.parse(cuentas);
      }
      return Promise.resolve(cuentas);
    });
  }


  moveToFront(cuentaId) {

    var old_index = this.cuentas.findIndex((obj) => { return obj.cuentaId == cuentaId });
    this.cuentas.splice(0, 0, this.cuentas.splice(old_index, 1)[0]);
    return this.guardarCuentasLocal();
  }


  actualizarCuentas() {

    var idsLocales = [];

    if (!this.gapiService.loggedIn) {
      Helper.log("actualizarCuentas: no estamos logados, no intentamos actualizar");
      return
    }

    return Promise.all(this.cuentas.map((cuenta) => {
      idsLocales.push(cuenta.cuentaId);
      if (cuenta.deleteMark || cuenta.cuentaId == null) {
        Helper.log("actualizarCuentas: " + "cuenta pendiente de borrar " + cuenta.cuentaId);
        return this.borrarCuenta(cuenta).catch(() => { return Promise.resolve() });
      }
      if (!cuenta.savedCloud) {
        // cuenta en la nube pero sin salvar, actualizamos y marcamos salvada
        //ahora actualizar cuenta tiene que gestionar si la cuenta no existe, lo hacemos en el backend
        return this.actualizarCuenta(cuenta)
      } else {
        // la cuenta está en la nube
        var opcionesRemotas = this.gapiService.cuentasRemotas.filter((obj) => {
          if (!obj) return false; return obj.cuentaId == cuenta.cuentaId
        });
        if (!opcionesRemotas || opcionesRemotas.length < 1) {
          
          // Aqui pueden pasar dos cosas: si yo tengo marcado que está guardada en remoto y no está, entonces
          // es que he borrado desde otro dispositivo. Otra opción más conservadora sería preguntar                            
       
          return this.borrarCuentaLocal(cuenta).catch(() => { return Promise.resolve() });
          //return this.actualizarCuenta(cuenta).catch(() => { return Promise.resolve() });;
        }
        else {
          // cuenta en la nube pero salvada, machacamos con el contenido de la nube                                                      }
          this.cuentas[this.cuentas.indexOf(cuenta)] = new CuentaLocalBean(opcionesRemotas[0]);
          return Promise.resolve(cuenta);
        }
      }
    }))
    .then(() => {
      return Promise.all(this.gapiService.cuentasRemotas.map((cuenta) => {
        if (idsLocales.indexOf(cuenta.cuentaId) < 0) {
          Helper.log("actualizarCuentas: " + "cuenta nueva recuperada de la nube " + cuenta.cuentaId);
          var cuentaLocal: CuentaLocalBean = new CuentaLocalBean(cuenta);
          return this.crearCuenta(cuentaLocal);
        }
      }));
    })
    .catch((error) => {
      Helper.log("actualizarCuentas() catch: Error al actualizar cuentas, no devolvemos nada " + error);
      return Promise.reject(error);
    });
  }


  //devuelve una promesa
  actualizarCuenta(nuevaCuenta: CuentaLocalBean) {

    nuevaCuenta.savedCloud = false;
    return this.actualizarCuentaRemota(nuevaCuenta)
    .then((cuentaGuardada: CuentaLocalBean) => {
      return this.actualizarCuentaLocal(cuentaGuardada);
    })
    .catch((error) => {
      Helper.log("actualizarCuenta() catch: Error al actualizar cuenta,devolvemos cuenta intacta " + error);
      return Promise.resolve(nuevaCuenta);

    });
  }


  actualizarCuentaLocal(nuevaCuenta: CuentaLocalBean) {

    return this.getCuentas()
    .then((cuentas) => {
      for (let cuenta of cuentas) {
        if (cuenta.cuentaId == nuevaCuenta.cuentaId) {
          cuentas[cuentas.indexOf(cuenta)] = nuevaCuenta;
        }
      }
      this.cuentas = cuentas;
      return this.guardarCuentasLocal();
    });
  }


  actualizarCuentaRemota(nuevaCuenta: CuentaLocalBean) {   

    return this.getGastos(nuevaCuenta.cuentaId)
    .then((gastos) => {
      return Promise.all(gastos.map((gasto) => {
        if (!gasto.savedCloud) {
          return this.actualizarGastoRemoto(gasto);
        }
        else return Promise.resolve();
      }));
    })
    .then(() => {
      return this.gapiService.actualizarCuenta(new CuentaRemotaBean(nuevaCuenta))
    })
    .then(() => {
      Helper.log("actualizarCuenta: " + "cuenta pendiente de salvar salvada: " + nuevaCuenta.cuentaId);
      nuevaCuenta.savedCloud = true;
      return nuevaCuenta;
    })
    .catch(() => {
      return Promise.resolve(nuevaCuenta);
    });
  }


    // devuelve una promesa, inserta en remoto si puede 
    crearCuenta(cuenta: CuentaLocalBean) {

      if (!cuenta.cuentaId) {
        cuenta.cuentaId = Helper.generateUUID();
        Helper.log("creamos nuevo id de cuenta: " + cuenta.cuentaId);
      }
    // primero metemos la cuenta
    this.cuentas.push(cuenta);

    // la intentamos crear en remoto, y a la vuelta actualizamos el savedCloud
    return this.insertarCuentaRemota(cuenta)
    .then((cuentaRemota) => {
      this.actualizarCuentaLocal(cuentaRemota)
    });
  }

    // Inserta una cuenta en romoto y actualiza la cuenta pasada
    // siempre vuelve por el then, haya actualizado o no
    // no guarda en local
    insertarCuentaRemota(cuenta: CuentaLocalBean) {

      var cuentaRemota: CuentaRemotaBean = new CuentaRemotaBean(cuenta);
      return this.gapiService.insertarCuenta(cuentaRemota)
      .then((cuentaRemota: CuentaRemotaBean) => {
        cuenta.savedCloud = true;
        return cuenta;
      })
      .catch((datos) => {
        Helper.log("Error en llamada a insertarCuenta con datos " + JSON.stringify(datos));
        return Promise.resolve(cuenta);
      });
    }


    // devuelve una promesa
    borrarCuenta(cuenta: CuentaLocalBean) {


      if (cuenta.cuentaId && cuenta.cuentaId.trim() != "") {

        Helper.log("ejecutar limpieza de gastos de " + cuenta.cuentaId);

        this.gapiService.borrarCuenta(cuenta.cuentaId)
        .then((resp) => {
          //aqui solo accedemos si se borró correctamente en remoto
          return this.borrarCuentaLocal(cuenta);
        })
        .catch((resp) => {
          if (resp && resp.code == "404") {
            Helper.log("borrarCuenta() : no se encuentra la cuenta remota, procedemos a su borrado local  " + cuenta.cuentaId);
            return this.borrarCuentaLocal(cuenta);
          }
        });

        //esto se ejecuta inmediatamente, se guarda en local y se vuelve
        return this.storage.remove("gastos:" + cuenta.cuentaId)
        .then(() => {
          this.gastosCache.splice(this.gastosCache.findIndex((obj) => { return obj.cuentaId == cuenta.cuentaId }), 1);
          cuenta.deleteMark = true;
          return this.actualizarCuentaLocal(cuenta);
        });

      }

   



  }


  borrarCuentaLocal(cuentaBorrada: CuentaLocalBean) {

    return this.getCuentas()
    .then(cuentas => {
      for (let cuenta of cuentas) {
        if (cuenta.cuentaId == cuentaBorrada.cuentaId) {
          cuentas.splice(cuentas.indexOf(cuenta), 1);
        }
      }
      this.cuentas = cuentas;
      return this.guardarCuentasLocal();
    });

  }

    // guarda el array en sqllite y devuelve una promesa;
    guardarCuentasLocal() {
      return this.storage.set("cuentas:" + this.usuarioLocal.email, JSON.stringify(this.cuentas));
    }

    // devuelve una promesa
    getCuenta(id: string) {
      return this.getCuentas()
      .then(cuentas => {
        for (let cuenta of cuentas) {
          if (id === cuenta.cuentaId) {
            return cuenta;
          }
        }
        return null;
      });
    }


  ////////////////////////////////////////////////////////////////////////////
  ////////////// GASTOS ///////////////////
  ////////////////////////////////////////////////////////////////////////////


  // devuelve null si no los encuentra en la cache
  getGastosCache(cuentaId: string) {

    let gastos = this.gastosCache.filter((obj) => {
      return obj.cuentaId == cuentaId
    });
    if (gastos && gastos.length > 0) {
      return gastos[0].gastos;
    }
    else return null;

  }



  getGastosLocal(cuentaId: string) {
    // si gastos ya está informado, devolvemos el array
    // si no vamos a buscarlo a la base de datos
    // lo devolvemos en una promise para que el tipo sea compatible
    // con todos los retornos posibles

    return this.storage.get("gastos:" + cuentaId)
    .then(gastos => {
      Helper.log("CuentasService: acceso a SQL ejecutado");
      if (!gastos || gastos === '') {
        gastos = [];
      }
      else {
        gastos = JSON.parse(gastos);
      }
      Helper.log("gastos size: " + gastos.length);
      this.actualizarGastosCache(cuentaId, gastos);
      return gastos;
    });

  }


  getGastos(cuentaId: string) {

    let gastos = this.getGastosCache(cuentaId);

    if (gastos) {
      Helper.log("CuentasService: acceso a SQL ahorrado");
      return Promise.resolve(gastos);
    }

    return this.forcedGetGastos(cuentaId);

  }


  forcedGetGastos(cuentaId: string) {

    var gastosLocales: Array<GastoLocalBean>;
    var gastosRemotos: Array<GastoRemotoBean>;

    var p1 = new Promise((resolve, reject) => {
      return this.getGastosLocal(cuentaId)
      .then((gastos) => {
        gastosLocales = gastos;
        return resolve(gastosLocales);
      })
      .catch(() => {
        gastosLocales = null;
        return resolve(null);
      });
    });

    // si falla en remoto devolvemos gastos vacios
    var p2 = new Promise((resolve, reject) => {
      return this.gapiService.getGastos(cuentaId)
      .then((gastos) => {
        gastosRemotos = gastos;
        return resolve(gastosRemotos);
      })
      .catch((error) => {
        Helper.log("error al recoger gastos remotos: " + error);
        gastosRemotos = null;
        return resolve(null);
      });
    });

    return Promise.all([p1, p2])
    .then(() => {
      if (gastosRemotos != null && gastosLocales != null) {
        return this.actualizarGastos(gastosLocales, gastosRemotos, cuentaId);
      }

    })
    .then(() => {
      return Promise.resolve(this.getGastosCache(cuentaId));
    })
    .catch((error) => {
      Helper.log("getGastos() catch: fallo al volver de Promise.all : + " + error);
    });

  }




  getGasto(gastoId: string, cuentaId: string) {

    return this.getGastos(cuentaId)
    .then(gastos => {
      for (let gasto of gastos) {
        if (gasto.gastoId === gastoId) {
          return gasto;
        }
      }
      return null;
    });
  }



  // actualiza o inserta
  actualizarGastosCache(cuentaId: string, gastosNuevos: Array<GastoLocalBean>) {

    if (cuentaId && gastosNuevos) {
      let index = this.gastosCache.findIndex((gastos) => { return gastos.cuentaId == cuentaId });
      if (index >= 0) {
        this.gastosCache[index].gastos = gastosNuevos;
      }
      else {
        this.gastosCache.push({ cuentaId: cuentaId, gastos: gastosNuevos });
      }
    }
  }

  //actualiza o añade si no lo encuentra
  actualizarGastoLocal(gastoNuevo: GastoLocalBean) {

    return this.getGastos(gastoNuevo.parentCuentaId)
    .then((gastos) => {
      var index = gastos.findIndex((obj) => { return obj.gastoId == gastoNuevo.gastoId });
      if (index >= 0) {
        gastos[index] = gastoNuevo;
      } else {
        gastos.push(gastoNuevo);
      }
      this.gastosCache[this.gastosCache.findIndex((obj) => { return obj.cuentaId == gastoNuevo.parentCuentaId })].gastos = gastos;
      return this.guardarGastosLocal(gastoNuevo.parentCuentaId);
    }
    );
  }


  actualizarGasto(gastoNuevo: GastoLocalBean) {

    this.actualizarGastoRemoto(gastoNuevo)

    return this.actualizarGastoLocal(gastoNuevo)
    .catch((error) => {
      Helper.log("actualizarGasto() catch: Error al actualizar gasto,devolvemos gasto intacta " + error);
      return Promise.resolve(gastoNuevo);

    });
  }

  actualizarGastoRemoto(gasto: GastoLocalBean) {

    let gastoRemoto = new GastoRemotoBean(gasto);

    return this.gapiService.actualizarGasto(gastoRemoto)
    .then(() => {
      gasto.savedCloud = true;
      return this.actualizarGastoLocal(gasto);
    });

  }




  actualizarGastos(gastosLocales: Array<GastoLocalBean>, gastosRemotos: Array<GastoRemotoBean>, cuentaId: string) {

    var idsLocales: Array<String> = new Array<String>();

    return Promise.all(gastosLocales.map((gastoLocal) => {
      idsLocales.push(gastoLocal.gastoId);
      if (gastoLocal.deleteMark) {
        return this.borrarGasto(gastoLocal);
      }
      if (!gastoLocal.savedCloud) {
        return this.gapiService.actualizarGasto(new GastoRemotoBean(gastoLocal))
        .then(() => {
          Helper.log("actualizarGastos(): " + "gasto pendiente de salvar salvada: " + gastoLocal.gastoId);
          gastoLocal.savedCloud = true;
          return Promise.resolve(gastoLocal);
        });
      } else {
        // cuenta en la nube pero salvada, machacamos con el contenido de la nube
        Helper.log("actualizarGastos(): " + "gasto salvada; recuperamos de la nube " + gastoLocal.gastoId);
        return this.actualizarGastoLocal(new GastoLocalBean(gastosRemotos.filter((obj) => { if (!obj) return false; return obj.gastoId == gastoLocal.gastoId })[0]));
      }
    }))
    .then(() => {
      return Promise.all(gastosRemotos.map((gasto) => {
        if (idsLocales.indexOf(gasto.gastoId) < 0) {
          Helper.log("actualizarGastos(): " + "gasto nueva recuperada de la nube " + gasto.gastoId);
          return this.actualizarGastoLocal(new GastoLocalBean(gasto));
        }
      }))
    })
    .catch((error) => {
      Helper.log("actualizarGastos() catch: Error al actualizar gastos, no devolvemos nada " + error);
      return Promise.reject(error);
    });

  }



  // devuelve una promesa
  borrarGasto(gasto: GastoLocalBean) {

    if (gasto.gastoId && gasto.parentCuentaId) {
      this.gapiService.borrarGasto(gasto)
      .then((resp) => {
          //aqui solo accedemos si se borró correctamente en remoto
          this.borrarGastoLocal(gasto);
        });
    }
    //esto se ejecuta inmediatamente, se guarda en local y se vuelve
    gasto.deleteMark = true;
    return this.actualizarGastoLocal(gasto);


  }


  borrarGastoLocal(gasto: GastoLocalBean) {

    return this.getGastos(gasto.parentCuentaId)
    .then((gastos) => {
      gastos.splice(gastos.findIndex((obj) => { return obj.gastoId == gasto.gastoId }), 1);
      return this.guardarGastosLocal(gasto.parentCuentaId);
    });
  }





  crearGasto(gasto: GastoLocalBean, cuentaId: string) {

    gasto.parentCuentaId = cuentaId;
    gasto.savedCloud = false;

    if (gasto.gastoId == "") {
      gasto.gastoId = Helper.generateUUID();
    }

    this.actualizarGastoRemoto(gasto);

    return this.actualizarGastoLocal(gasto);

  }

  guardarGastosLocal(cuentaId: string) {

    return this.storage.set("gastos:" + cuentaId, JSON.stringify(this.getGastosCache(cuentaId)));

  }


  actualizarBalances(cuenta: CuentaLocalBean) {

    this.balances = [];
    for (let participante of cuenta.participantes) {
      this.balances.push({ nombre: participante.nombre, email: participante.email, balanceTotal: 0, subBalances: [] });
    }
    for (let balance of this.balances) {
      for (let participante of cuenta.participantes) {
        balance.subBalances.push({ nombre: participante.nombre, email: participante.email, balance: 0 });
      }
    }

    return this.getGastos(cuenta.cuentaId).then(gastos => {
      var receptores: number;
      for (let gasto of gastos) {
      if (gasto.deleteMark) continue;
        this.sumarBalance(gasto.pagador, 1 * gasto.cantidad);
        receptores = 0;
        for (let participante of gasto.receptores) {
          if (participante.receptor) {
            receptores += 1;
          }
        }
        // receptores tiene el numero de receptores, dividimos la cantidad entre ellos
        var reparto: number = +gasto.cantidad / +receptores;
        for (let participante of gasto.receptores) {
          if (participante.receptor) {
            this.sumarBalance(participante.nombre, -1 * reparto);
          }
        }
      }
      return Promise.resolve(this.balances);
    });
  }


  sumarBalance(participante: string, cantidad: number) {

    for (let sub of this.balances) {
      if (participante === sub.nombre) {
        sub.balanceTotal += +cantidad;
      }
    }
  }

}

