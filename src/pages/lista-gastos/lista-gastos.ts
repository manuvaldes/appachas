import { NavController, NavParams, ActionSheetController, Platform, AlertController, Events} from 'ionic-angular';

import {NuevoGastoPage} from '../../pages/nuevo-gasto/nuevo-gasto';
import {CuentasService} from '../../providers/local-data/cuentas-service'
import {CuentaLocalBean, GastoLocalBean} from '../../providers/local-data/beans'
import {NuevaCuentaPage} from '../../pages/nueva-cuenta/nueva-cuenta';
import { Component} from '@angular/core';

/*
  Generated class for the ListaGastosPage page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
  */
  @Component({
    selector: 'lista-gastos',
    templateUrl: 'lista-gastos.html'
  })
  export class ListaGastosPage {

    cuentaId: string;
    cuentaBean: CuentaLocalBean;

    gastos: Array<GastoLocalBean> = [];

    constructor(  public nav: NavController, 
                  public navParams: NavParams, 
                  public platform: Platform, 
                  public cuentasService: CuentasService, 
                  public events: Events,
                  public alertCtrl: AlertController,
                  public actionSheetCtrl: ActionSheetController

                  ) {


      this.cuentaId = navParams.get('nombre');

      cuentasService.getGastosLocal(this.cuentaId)
      .then((gastos) => {
        this.gastos = gastos;
      })
      .then(() => {
        cuentasService.forcedGetGastos(this.cuentaId)
        .then(gastos => {
          this.gastos = gastos;
        })
      });

      cuentasService.getCuenta(this.cuentaId)
      .then((cuenta) => {
        this.cuentaBean = cuenta
      });
    }


    nuevoGasto() {

    //lo creamos como modal para volver mas facilmente devolviendo datos
    // NADA: todo mentira, los gastos se actualizan solos

    //si pasamos null como gasto, es nuevo
    /*let crearGastoModal = Modal.create(NuevoGastoPage, { nombre: this.nombreCuenta , gasto: null});
    crearGastoModal.onDidDismiss(gastos => { 
      this.gastos = gastos });
      this.nav.present(crearGastoModal);*/

      this.nav.push(NuevoGastoPage, { nombre: this.cuentaId, gasto: null });
    }

    editarGasto(gasto: GastoLocalBean) {
    // si pasamos un bean como gasto, es para editar
    // no lo vamos a hacer como modal, sino como pagina
    /* let crearGastoModal = Modal.create(NuevoGastoPage, { nombre: this.nombreCuenta, gasto: gasto });
    //al volver actualizamos el array de gastos
    crearGastoModal.onDidDismiss(gastos => { 
      this.gastos = gastos });
      this.nav.present(crearGastoModal); */

      this.nav.push(NuevoGastoPage, { nombre: this.cuentaId, gasto: gasto });

    }

    ionViewDidEnter() {
    //recargamos el array siempre que entramos
    this.cuentasService.getGastos(this.cuentaId)
    .then(gastos => {
      this.gastos = gastos;
    });
  }


  openSettings() {

    let actionSheet = this.actionSheetCtrl.create({
      title: 'Acciones',
      cssClass: 'action-sheets-basic-page',
      buttons: [
      {
        text: 'Editar Cuenta',
        icon: !this.platform.is('ios') ? 'settings' : null,
        handler: () => {
            // let editarCuentaModal = Modal.create(NuevaCuentaPage, { nombre: this.nombreCuenta });
            //editarCuentaModal.onDidDismiss(datos => { 
            //});  
            //this.nav.present(editarCuentaModal);
            this.nav.push(NuevaCuentaPage, { nombre: this.cuentaId });

          }
        },
        {
          text: 'Compartir Cuenta',
          icon: !this.platform.is('ios') ? 'share' : null,
          handler: () => {
            console.log('share clicked');
          }
        },
        {
          text: 'Borrar Cuenta',
          role: 'destructive',
          icon: !this.platform.is('ios') ? 'trash' : null,
          handler: () => {

            let alert = this.alertCtrl.create({
              title: '¡Atención!',
              subTitle: '¿Está seguro de querer borrar ' + this.cuentaBean.nombre + '?',
              buttons: [{
                text: 'OK', handler: () => {
                  this.cuentasService.borrarCuenta(this.cuentaBean)
                  .then(() => {
                    this.events.publish('cuentas:created');
                  });

                }
              }]
            });

            alert.present();

          }
        },
        {
          text: 'Cancel',
                    role: 'cancel', // will always sort to be on the bottom
                    icon: !this.platform.is('ios') ? 'close' : null,
                    handler: () => {
                      console.log('Cancel clicked');
                    }
                  }
                  ]
                });

    actionSheet.present();
  }

}



