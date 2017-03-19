import { NgModule } from '@angular/core';
import { IonicApp, IonicModule } from 'ionic-angular';
import { Appachas } from './app.component';
import { ListaGastosPage } from '../pages/lista-gastos/lista-gastos';
import { NuevaCuentaPage } from '../pages/nueva-cuenta/nueva-cuenta';
import { NuevoGastoPage } from '../pages/nuevo-gasto/nuevo-gasto';
import { ResumenCuentaPage } from '../pages/resumen-cuenta/resumen-cuenta';
import { CuentasService} from '../providers/local-data/cuentas-service';
import { GapiService} from '../providers/gapi-data/gapi-data';
import { ToDatePipe} from '../pipes/toDate';
import { OrderByPipe} from '../pipes/orderBy';

@NgModule({
  declarations: [
    Appachas,
    ListaGastosPage,
    NuevaCuentaPage,
    NuevoGastoPage,
    ResumenCuentaPage,
    ToDatePipe,
    OrderByPipe
  ],
  imports: [
    IonicModule.forRoot(Appachas, 
    {
      activator: "ripple", 
      prodMode: false
    })
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    Appachas,
    ListaGastosPage,
    NuevaCuentaPage,
    NuevoGastoPage,
    ResumenCuentaPage
  ],
  providers: [ CuentasService, GapiService]
})

export class AppModule {}
