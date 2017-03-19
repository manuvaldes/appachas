 import {LoadingController, NavController, NavParams, ActionSheetController, Platform, AlertController,Events} from 'ionic-angular';
import {CuentasService} from '../../providers/local-data/cuentas-service'
import {ListaGastosPage} from '../../pages/lista-gastos/lista-gastos';
import {NuevaCuentaPage} from '../../pages/nueva-cuenta/nueva-cuenta';
import {CuentaLocalBean} from '../../providers/local-data/beans';
import {Helper} from '../../app/helper';
import {Component} from '@angular/core';

/*
  Generated class for the ResumenCuentaPage page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
  */
  @Component({
    selector: 'resumen-cuenta',
    templateUrl: 'resumen-cuenta.html',
  })

  export class ResumenCuentaPage {

    cuentaActual: string = "";
    //cuentas: Array<CuentaBean> = [];
    cuenta: CuentaLocalBean;

    balances: Array<{
      email: string,
      balanceTotal: number,
      subBalances:
      Array<{
        email: string,
        balance: number

        
      }>
    }>;

    constructor(  public platform: Platform, 
                  public nav: NavController, 
                  public navParams: NavParams, 
                  public cuentasService: CuentasService, 
                  public events: Events,
                  public alertCtrl: AlertController,
                  public actionSheetCtrl: ActionSheetController,
                  public laodingCtrl: LoadingController

                  ) {


      Helper.log("ResumenCuentaPage: iniciar constructor");
    // esto es para enseñar solo una tarjeta
    this.cuentaActual = navParams.get('nombre');



    Helper.log("ResumenCuentaPage: finalizar constructor 2");
    // Esto era para tarjetas multiples
    /* cuentasService.getCuentas().then(cuentas => this.cuentas = cuentas);
   
    this.cuentaActual = navParams.get("nombre"); */

  }

  ionViewWillEnter() {   

    Helper.log("Test");
                      }

  ionViewWillLeave() {   

    Helper.log("Test");
                      }

  ionViewDidEnter() {

    if (this.cuentaActual) {
      // cada vez que entramos en una cuenta, la movemos al frente del array
      this.cuentasService.moveToFront(this.cuentaActual);


      this.balances = [];
      this.cuentasService.getCuenta(this.cuentaActual).then(cuenta => {
        this.cuenta = cuenta;
        this.cuentasService.actualizarBalances(this.cuenta)
        .then(balances => {
          this.balances = balances;
        })
        .catch((error) => {
          Helper.log("catch onPageDidEnter(): " + error);
        });

          Helper.log("ResumenCuentaPage: finalizar  constructor1 ");
        });
      }


    // ESTE CODIGO ROMPE LA VERSION IOS, SE QUEDA LA PAGINA SWIPEADA A LA IZQUIERDA

    //var tarjeta = document.getElementById(this.cuentaActual);
    /* if (tarjeta !== null) {
       Helper.log("scroll a " + this.cuentaActual);
       tarjeta.scrollIntoView(true);
       tarjeta.scrollTop = 0;
     }
      //tarjeta.scrollIntoView(true);
      */

    }

    verCuenta(title) {
      this.nav.push(ListaGastosPage, { nombre: title });
    }


    refresh() {

      let loading = this.laodingCtrl.create({
        content: "Actualizando gastos...",
        duration: 30
      });
      loading.present();



      this.cuentasService.forcedGetGastos(this.cuentaActual)
      .then(() => {

        loading.dismiss();
      });

    }

    openSettings() {

    if (!this.cuenta ) {   
    return;
                                                                }

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
              this.nav.push(NuevaCuentaPage, { nombre: this.cuenta.cuentaId });

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
                subTitle: '¿Está seguro de querer borrar ' + this.cuenta.nombre + '?',
                buttons: [{
                  text: 'OK', handler: () => {
                    this.cuentasService.borrarCuenta(this.cuenta)
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
