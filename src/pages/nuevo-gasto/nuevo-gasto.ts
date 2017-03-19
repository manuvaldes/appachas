import { ToastController, NavController, NavParams} from 'ionic-angular';
import {CuentasService} from '../../providers/local-data/cuentas-service'
import {CuentaLocalBean, GastoLocalBean} from '../../providers/local-data/beans'
import {Component} from '@angular/core';

/*
  Generated class for the NuevoGastoPage page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
  */
@Component({
    selector: 'nuevo-gasto',
    templateUrl: 'nuevo-gasto.html',

})


export class NuevoGastoPage {

    cuentaId: string;
    cuentaBean: CuentaLocalBean;
    gastoBean: GastoLocalBean;

    nuevo: boolean;

    // importamos view controller para devolver el control como modal
    constructor(  public nav: NavController, 
                  public navParams: NavParams,  
                  public cuentasService: CuentasService,
                  public toastCtrl: ToastController
                  ) {

    this.cuentaId = navParams.get('nombre');
    this.gastoBean = navParams.get('gasto');
    if (this.gastoBean == null) {
      this.nuevo = true;
      this.gastoBean = new GastoLocalBean;
      this.gastoBean.parentCuentaId = this.cuentaId;
    }

    if (!this.gastoBean.fecha) {
      // la fecha la vamos a guardar como un string que es como mas le gusta al input de tipo date
      this.gastoBean.fecha = new Date().toISOString().slice(0, 10);
    }


    //si es nuevo informamos los receptores. si no, el bean carga directamente los datos
    cuentasService.getCuenta(this.cuentaId).then((cuenta) => {
      this.cuentaBean = cuenta;

      for (let participante of cuenta.participantes) {
        var opciones = this.gastoBean.receptores.filter((obj) => {
          return obj.nombre == participante.nombre;
        });
        if (!opciones || opciones.length == 0) {
          // si es un gasto nuevo, empieza a true, si no, empieza a false
          this.gastoBean.receptores.push({ nombre: participante.nombre, receptor: this.nuevo });
        }
      }
    });
  }


  borrarGasto() {

    this.cuentasService.borrarGasto(this.gastoBean)
    .then(gastos => {
      this.nav.pop();
    });
  }

  crearGasto(input) {
    //con que haya nombre guardamos

    let toast = this.toastCtrl.create({
      message: '',
      duration: 3000
    });

    if (!this.gastoBean.nombre || this.gastoBean.nombre.trim() == "") {
      toast.setMessage("Introduzca un nombre válido para el gasto");
      toast.present();
      input._form._inputs[0].setFocus();
      return;
    }

    if (!this.gastoBean.cantidad || isNaN(this.gastoBean.cantidad) ) {
      toast.setMessage("Introduzca una cantidad válida para el gasto");
      toast.present();
      input._form._inputs[1].setFocus();
      return;
    }

    if (!this.gastoBean.pagador || this.gastoBean.pagador.trim() == "" ) {
      toast.setMessage("Debe seleccionar un pagador válido");
      toast.present();
      input._form._inputs[2].setFocus();
      return;
    }



    if (this.nuevo) {
      this.cuentasService.crearGasto(this.gastoBean, this.cuentaId)
      .then(gastos => {
        this.cuentaBean.savedCloud = false;
        this.cuentasService.actualizarCuenta(this.cuentaBean);
        this.nav.pop();
      });

    }
    else {
      this.cuentasService.actualizarGasto(this.gastoBean).then(gastos => {
        this.nav.pop();
        this.cuentaBean.savedCloud = false;        
        this.cuentasService.actualizarCuenta(this.cuentaBean);
      });
    }

  }
}