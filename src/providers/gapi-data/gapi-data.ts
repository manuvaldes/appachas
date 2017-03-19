import {Platform} from 'ionic-angular';
import {Helper} from '../../app/helper';
import {Injectable} from '@angular/core';
import {Http} from '@angular/http';
import {UsuarioLocalBean, CuentaRemotaBean, GastoLocalBean, GastoRemotoBean} from '../local-data/beans'
import 'rxjs/add/operator/map';

/*
  Generated class for the GapiData provider.

  See https://angular.io/docs/ts/latest/guide/dependency-injection.html
  for more info on providers and Angular 2 DI.
    */

  @Injectable()
  export class GapiService {


    loggedIn = false;
    email: string = null;
    public avatar = null;
    cuentasRemotas: Array<CuentaRemotaBean> = null;





    constructor(public http: Http, public platform: Platform) {

    //this.loadAPI().then((resp) => { return this.signin(true) }).then((resp) => { return this.doSomethingGoogley() });
  }

    //devuelve una promesa
    initGapi() {

      return this.loadAPI()
      .then((resp) => { 
        return this.signin(true) 
      });

    }


    executeApi(apiCall: any, requestPARAM: any) {

      if (!this.loggedIn) {
        return new Promise((resolve, reject) => {
          return reject("executeApi() ERROR: usuario no logado");
        });
      }

      return new Promise((resolve, reject) => {
        gapi.client['apachasApi'][apiCall](requestPARAM).execute((resp) => {
          if (!resp || resp.code) {
            Helper.log(Date.now().toLocaleString() + " Respuesta incorrecta del API " + apiCall + " con parametros " + JSON.stringify(requestPARAM) + " :\r\n" + JSON.stringify(resp));
          // ojo este return es importante para que no continue despues del reject
          return reject(resp);
        } else {
          Helper.log(Date.now().toLocaleString() + " Respuesta correcta del API " + apiCall + " con parametros " + JSON.stringify(requestPARAM) + " :\r\n" + JSON.stringify(resp));
          resolve(resp);
        }
      });
      });
    }

    getCuentas(email: string) {

      return this.executeApi("getCuentas", { userId: email })
      .then((resp) => {
        if (resp['items']) {
          this.cuentasRemotas = resp['items'];
        }
        else {
          this.cuentasRemotas = [];
        }
        return Promise.resolve(this.cuentasRemotas);
      });
    }



    getGastos(cuentaId: string) {

      var gastosRemotos: Array<GastoRemotoBean>;

      return this.executeApi("listGastosCuenta", { cuentaId: cuentaId })
      .then((resp) => {
        if (resp['items']) {
          gastosRemotos = resp['items'];
        } else {
          gastosRemotos = [];
        }
        return Promise.resolve(gastosRemotos);
      });
    }


    borrarGasto(gasto: GastoLocalBean) {

      return this.executeApi("removeGasto", new GastoRemotoBean(gasto));
    }


    //TODO actualizar gasto tiene que crear el gasto si no existe
    actualizarGasto(gasto: GastoRemotoBean) {

      return this.executeApi("updateGasto", { idGasto: gasto.gastoId, resource: gasto });
    }


    insertarUsuario(usuario: UsuarioLocalBean) {

      return this.executeApi("insertUsuario", { email: usuario.email, nombre: usuario.nombre, cuentas: [], version: 0 });
    }


    insertarCuenta(cuenta: CuentaRemotaBean) {

      return this.executeApi("insertCuenta", cuenta);

    }


    //actualizar cuenta tiene que crear la cuenta si no existe
    actualizarCuenta(cuenta: CuentaRemotaBean) {

      return this.executeApi("updateCuenta", { idCuenta: cuenta.cuentaId, resource: cuenta });
    }


    borrarCuenta(cuentaId: string) {

      return this.executeApi("removeCuenta", { cuentaId: cuentaId });
    }

    insertarGasto(gasto: GastoRemotoBean) {

      return this.executeApi("insertGasto", gasto);

    }







    loadAPI() {
      return new Promise((resolve) => {
        window['__onGoogleLoaded'] = () => {
          var apisToLoad;

        // gapi.client.setApiKey('AIzaSyDThA8arC5Un8L6XUSipIAzM8lwd1Y0et0');
        apisToLoad = 2; // must match number of calls to gapi.client.load()
        let callback = () => {
          if (--apisToLoad == 0) {
            //Aqui ponemos el codigo que queramos que se llame cuando se hayan cargado todas las apis
            Helper.log(Date.now().toLocaleString() + " al terminar de cargar el api: " + apisToLoad);
            // resolvemos la promesa cuando ya esté cargado el api
            // TODO a veces sigue llegando aqui antes de tener cargadas las apis, puede ser efecto del depurador                
            resolve(window['gapi']);
          }
        };

        Helper.log(Date.now().toLocaleString() + " Antes de cargar al api");
        //hay que pasar una referencia a la funcion, no llamar a la funcion con callback(this) por ejemplo
        let apiUrlProd = 'https://apachas-1292.appspot.com/_ah/api';
        let apiUrlDev = 'http://localhost:8080/_ah/api';
        gapi.client.load('apachasApi', 'v1', callback, apiUrlProd);
        gapi.client.load('oauth2', 'v2', callback);


      }
      this.loadScript();
    });
    }


    signin(silent: boolean) {

      var scopes = 'https://www.googleapis.com/auth/userinfo.email';

    // TODO: eliminar web_client_id para acceso en produccion
    // esta clave no está funcionando en android porque necesita un origen file:// que no es posible
    var web_client_id = '911192582823-pss7ai25fatsdop984853ekhk07th337.apps.googleusercontent.com';

    // esta funcion la podemos sustituir por un settoken cuando tengamos el token de acceso android

    return new Promise((resolve, reject) => {

      Helper.log("probando sign in silencioso? " + silent);
      if (!this.platform.is('android')) {
        gapi.auth.authorize({ client_id: web_client_id, scope: scopes, immediate: silent }, (obj) => { return this.getUserInfo(obj).then(() => { resolve(obj) }) });
      } else {
        if (silent) {
          window['plugins'].googleplus.trySilentLogin({ scopes: 'email', webClientId: web_client_id, offline: true },
            (obj) => { return this.getUserInfo(obj).then(() => { resolve(obj) }) },
            (obj) => { Helper.log("resultado erroneo en el sign in android " + obj); return reject(obj); }
            );

        } else {

          window['plugins'].googleplus.login({ scopes: 'email', webClientId: web_client_id, offline: true },
            (obj) => { return this.getUserInfo(obj).then(() => { resolve(obj) }) },
            (obj) => { Helper.log("resultado erroneo en el sign in android " + obj); return reject(obj); }
            );
        }
      }
    });
  }

  getUserInfo(obj: any) {

    return new Promise((resolve) => {
      Helper.log("exito en el sign in: " + JSON.stringify(obj));

      if (!this.platform.is('android')) {
        var request = gapi.client['oauth2'].userinfo.get().execute((resp) => { this.parseUserInfo(resp); resolve(resp) });
      } else {
        gapi['auth'].setToken({ access_token: obj.oauthToken, error: '',expires_in:'', state: '' });
        gapi.client['oauth2'].userinfo.get().execute((resp) => { this.parseUserInfo(resp); resolve(resp) });
      }
    });

  }

  parseUserInfo(resp: any) {

    if (!resp.code) {
      Helper.log("usuario autenticado: " + JSON.stringify(resp));
      this.email = resp.email;
      this.avatar = resp.picture;
      this.loggedIn = true;
    }
    else {
      Helper.log("fallo al autenticar usuario " + JSON.stringify(resp));
    }

  }



  googleLogout() {
    if (!this.platform.is('android')) {
      gapi.auth.signOut();
      gapi.auth.setToken(null);
      this.email = null;
      this.loggedIn = false;
    } else {
      window['plugins'].googleplus.logout(() => {
        gapi.auth.signOut();
        gapi.auth.setToken(null);
        this.email = null;
        this.loggedIn = false;
      });
    }
  }



  loadScript() {

    const url = 'https://apis.google.com/js/client.js?onload=__onGoogleLoaded';
    Helper.log('loading..');
    let node = document.createElement('script');
    node.src = url;
    node.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(node);

  }


  doSomethingGoogley() {

    Helper.log(Date.now().toLocaleString() + "Llamamos al api");
    //gapi.client.apachasApi.listCuentas().execute((resp) => {
    //        Helper.log(Date.now().toLocaleString() + " Respuesta del API: " + JSON.stringify(resp));
    //      });  

    //gapi.client.apachasApi.listCuentas().execute().then((resp) => { Helper.log("respuesta en modo alternativo:  " + resp) });
    this.executeApi("listCuentas", '');
    let PARAM = { email: 'manuvaldes@gmail.com', nombre: 'Manu', version: 1 };

  }

}

