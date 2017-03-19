export class CuentaLocalBean {

	nombre: string = "";
	cuentaId: string = null;	
	desc: string = "";
	participantes: Array<{  email: string , nombre: string}> = [];
	savedCloud: boolean = false;
	deleteMark: boolean = false;
	
	constructor();
	constructor(remota: CuentaRemotaBean);
	constructor(remota?: any) {     
		if (remota) {
			this.nombre = remota.nombre;
			this.cuentaId = remota.cuentaId;			
			this.desc = remota.desc;
			if (remota.participantes) {
				this.participantes = remota.participantes;
			}
			// si construimos desde una remota, esta por definicion salvada
			this.savedCloud = true;

		}

	}
}

export class CuentaRemotaBean {

	nombre: string = "";
	cuentaId: string = null;
	desc: string = "";
	participantes: Array<{ email: string ,nombre: string }> = [];
	divisa: string = "";
	
	constructor();
	constructor(local: CuentaLocalBean);
	constructor(local?: any) {
		if (local) {
			this.nombre = local.nombre;
			this.cuentaId = local.cuentaId;
			this.desc = local.desc;
			this.participantes = local.participantes;

		}
	}
}

export class GastoLocalBean {

	gastoId: string ="";
	nombre: string ;	
	cantidad: number;	
	pagador: string;
	fecha: string;
	parentCuentaId: string;
	receptores: Array<{ nombre: string, receptor:boolean }> = [];
	savedCloud: boolean = false;
	deleteMark: boolean = false;
	
	constructor();
	constructor(remoto: GastoRemotoBean);
	constructor(remoto?: any) {
		if (remoto) {

			this.gastoId = remoto.gastoId;
			this.parentCuentaId = remoto.parentCuentaId;
			this.nombre = remoto.nombre;			
			this.cantidad = remoto.cantidad;
			this.pagador = remoto.nombrePagador;
			this.fecha = remoto.fecha.slice(0,10);
			this.receptores = remoto.receptores;
			this.savedCloud = true;
			
		}
	}



}

export class GastoRemotoBean {

	gastoId: string = "";
	nombre: string;
	parentCuentaId: string = null;
	cantidad: number;
	fecha: string;
	nombrePagador: string;
	receptores: Array<{ nombre: string, receptor: boolean }> = [];

	constructor();
	constructor(local: GastoLocalBean);
	constructor(local?: any) {
		if (local) {

			this.gastoId = local.gastoId;
			this.nombre = local.nombre;			
			this.cantidad = local.cantidad;
			this.fecha = local.fecha;
			this.nombrePagador = local.pagador;
			this.receptores = local.receptores;
			this.parentCuentaId = local.parentCuentaId;

		}
	}
}



export class UsuarioLocalBean {     

	email: string = null;
	nombre: string = null;
	version: number = 0;
	inLocal: boolean = false;
	inRemote: boolean = false;
	

}