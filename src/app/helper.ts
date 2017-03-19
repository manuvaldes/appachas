
export class Helper {
	
	static mode ;

	  static generateUUID() {

	  var d = Date.now();
	  if (window.performance && typeof window.performance.now === "function") {
	          d += performance.now(); //use high-precision timer if available
	  }
	  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
	          var r = (d + Math.random() * 16) % 16 | 0;
	          d = Math.floor(d / 16);
	          return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
	  });
	  return uuid;
	}


	static log(mensaje: string) {

	  var millis = Date.now() % 86400000;

	  var hora = Math.floor(millis / 3600000).toString();
	  var minutos = Math.floor((millis % 3600000) / 60000).toString();
	  var segundos = Math.floor((millis % 60000) / 1000).toString();
	  var milisegundos = (millis % 1000).toString();

	  if (hora.length < 2) hora = "0" + hora;
	  if (minutos.length < 2) minutos = "0" + minutos;
	  if (segundos.length < 2) segundos = "0" + segundos;
	  while (milisegundos.length < 3) milisegundos = "0" + milisegundos;


	  console.log(hora + ":" + minutos + ":" + segundos + "." + milisegundos + " -- " + Helper.mode + " -- " + mensaje);

	}




}