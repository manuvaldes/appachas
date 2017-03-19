import {Platform} from 'ionic-angular';
import {Injectable} from '@angular/core';
import {Storage} from '@ionic/storage';
import {Helper} from '../../app/helper'
import {GastoLocalBean, CuentaLocalBean, GastoRemotoBean} from './beans'
import {GapiService} from '../gapi-data/gapi-data'
import 'rxjs/add/operator/map';

//import {NuevaGastoPage} from '../../pages/nueva-gasto/nueva-gasto';
//import {ListPage} from '../../pages/list/list';

/*
  Generated class for the LocalData provider.

  See https://angular.io/docs/ts/latest/guide/dependency-injection.html
  for more info on providers and Angular 2 DI.
    */
  @Injectable()
  export class GastosService {
    // inicializamos a null para que si se reinicia el servicio, podamos distinguirlo
    // de array vacio y se fuerce una recarga desde sqllite

    //almacena la gasto actual por si nos piden otra

    // Ojito al comportamiento: como este servicio se mete como provider, cada pagina que lo inyecta tiene
    // su propia instancia por tanto cada pagina tiene su propia cache de cuentaAbierta
    // CAMBIADO: ahora es una instancia para toda la aplicacion, la cache es de solo una cuenta



    cuentaAbierta: string = null;
    gastosCache: Array<{ cuentaId: string, gastos: Array<GastoLocalBean> }> = [];

    storage: Storage = null;
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


    constructor(public platform: Platform, public gapiService: GapiService) {
    // no abrimos el storage en el constructor, sino cuando nos pidan gastos
    // luego tenemos que comprobar si la gasto actual es la que tiene el constructor abierto

    Helper.log("GastosService: iniciar constructor");
    this.storage = new Storage();
    Helper.log("GastosService: finalizar constructor");

  }

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
        resolve(gastosLocales);
      });
    });


    var p2 = new Promise((resolve, reject) => {
      return this.gapiService.getGastos(cuentaId)
      .then((gastos) => {
        gastosRemotos = gastos;
        resolve(gastosRemotos);
      })
      .catch((error) => {
        Helper.log("error al recoger gastos remotos: " + error);
        gastosRemotos = [];
        resolve([]);
      });
    });

    return Promise.all([p1, p2])
    .then(() => {
      return this.actualizarGastos(gastosLocales, gastosRemotos, cuentaId);
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




  borrarCuenta(cuentaId: string) {

    Helper.log("ejecutar limpieza de gastos de " + cuentaId);
    return this.storage.remove("gastos:" + cuentaId)
    .then(() => {
      return this.gastosCache.splice(this.gastosCache.findIndex((obj) => { return obj.cuentaId == cuentaId }), 1);
    });
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


        
        if (!gasto.deleteMark) {
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

