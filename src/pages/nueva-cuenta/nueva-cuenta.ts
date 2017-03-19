
import {ToastController,ViewController, NavController, NavParams} from 'ionic-angular';
import {CuentaLocalBean} from '../../providers/local-data/beans'
import {CuentasService} from '../../providers/local-data/cuentas-service'
import {ResumenCuentaPage} from '../../pages/resumen-cuenta/resumen-cuenta';
import {Component} from '@angular/core';

@Component({
	selector: 'nueva-cuenta',
	templateUrl: 'nueva-cuenta.html',
})
export class NuevaCuentaPage {

	nueva: boolean;

	nuevoParticipante: string;
	nav: NavController;
	cuenta: CuentaLocalBean;

	constructor( nav: NavController, 
		         navParams: NavParams, 
		         public cuentasService: CuentasService ,
		         public viewCtrl: ViewController,
		         public toastCtrl: ToastController
		         		) {
		this.nav = nav;

		var cuentaId = navParams.get("nombre");
		this.nueva = ( cuentaId == "" || !cuentaId );

		if (!this.nueva) {     
			cuentasService.getCuenta(cuentaId).then(cuenta => {
				this.cuenta = cuenta;
			});
		} else {
			this.cuenta = new CuentaLocalBean();
		}

	}

	crearCuenta(input) {

	let toast = this.toastCtrl.create({
	     message: '',
	     duration: 3000
	   });

	   if (!this.cuenta.nombre || this.cuenta.nombre.trim() == "") {
	     toast.setMessage("Introduzca un nombre válido para la cuenta");
	     toast.present();
	     input._form._inputs[0].setFocus();
	     return;
	   }


		this.cuentasService.getCuentas().then(cuentas => {			
			console.log('nombreCuenta: ' + this.cuenta.nombre + ' descripcion: ' + this.cuenta.desc);
			if (this.nueva) {
				this.cuentasService.crearCuenta(this.cuenta)
				.then(datos => {
					this.nav.setRoot(ResumenCuentaPage, { nombre: this.cuenta.cuentaId });
				});
			} else {
				this.cuentasService.actualizarCuenta(this.cuenta)
				.then((cuentas) => {
					this.viewCtrl.dismiss(cuentas);
				});
			}
		});
	}

	addParticipante() {
  	  // parece que hay que comprobar si existe primero el campo, al iniciarse la pagina no debe existir ¿?

  	  if (this.nuevoParticipante && this.nuevoParticipante != "") {
  	  	if (this.cuenta.participantes == undefined) {     
  	  		this.cuenta.participantes = [];

  	  	}
  	  	this.cuenta.participantes.push({ nombre: this.nuevoParticipante, email: "" });
  	  	this.nuevoParticipante = "";
  	  }
  	}


  	removeItem(item) {

  		for (let i = 0; i < this.cuenta.participantes.length; i++) {

  			if (this.cuenta.participantes[i] == item) {
  				this.cuenta.participantes.splice(i, 1);
  			}

  		}

  	}



  }
