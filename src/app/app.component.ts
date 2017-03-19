import {Events, App, Platform, MenuController, Config} from 'ionic-angular';
import {Splashscreen, StatusBar, AdMob} from 'ionic-native';
import {ViewChild,Component} from '@angular/core';
import {Nav} from 'ionic-angular';
import {Helper} from './helper';
import { NuevaCuentaPage } from '../pages/nueva-cuenta/nueva-cuenta';
import { ResumenCuentaPage } from '../pages/resumen-cuenta/resumen-cuenta';
import { CuentasService} from '../providers/local-data/cuentas-service';
import { GapiService} from '../providers/gapi-data/gapi-data';

@Component({
  templateUrl: 'app.html'
  // http://ionicframework.com/docs/v2/api/config/Config/
})
export class Appachas {

  @ViewChild(Nav) nav: Nav;

  // make HelloIonicPage the root (or first) page
  rootPage: any = ResumenCuentaPage;
  admobId: { banner: string, interstitial: string };
  

  constructor(
    private app: App,
    private platform: Platform,
    private menu: MenuController,
    public events: Events,
    public config: Config,
    public cuentasService: CuentasService,
    public gapiService: GapiService,

    ) {


    Helper.mode = (this.config.get("prodMode",false)==true) ? "prod" : "dev";


    this.events.subscribe("cuentas:created", () => {

      if (!this.cuentasService.cuentas || this.cuentasService.cuentas.length < 1) {
        this.nav.setRoot(ResumenCuentaPage);
      }
      else {
        var index = this.cuentasService.cuentas.findIndex((cuenta) => {
          return !cuenta.deleteMark;
        });
        if (index > -1) {

          this.openPage("ListaGastosPage", this.cuentasService.cuentas[index].cuentaId);
        } else {
          this.nav.setRoot(ResumenCuentaPage);
        }
      }
    });


    Helper.log("App: iniciar constructor");
    this.initializeApp();


    Helper.log("App: finalizar constructor");
  }

  initializeApp() {
    Helper.log("App: init app");

    if (/(android)/i.test(navigator.userAgent)) {
      this.admobId = {
        banner: 'ca-app-pub-1381559050796045/5571181305',
        interstitial: 'ca-app-pub-jjj/kkk'
      };
    } else if (/(ipod|iphone|ipad)/i.test(navigator.userAgent)) {
      this.admobId = {
        banner: 'ca-app-pub-ddd/sss',
        interstitial: 'ca-app-pub-ppp/zzz'
      };
    }



    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      StatusBar.styleDefault();
      Splashscreen.hide();



      if (AdMob) {
        AdMob.createBanner({
          adId: this.admobId.banner,
          isTesting: false,
          overlap: false,
          offsetTopBar: false,
          position: AdMob['AD_POSITION.BOTTOM_CENTER'],
          bgColor: 'black'
        });
      }

      Helper.log("App: fin initapp");



    });


    Helper.log("App: fin init app2 ");
  }


  googleSignIn() {

    this.menu.close();
    this.cuentasService.signIn(false);


  }


  openPage(page, title) {
    // close the menu when clicking a link from the menu
    Helper.log(page + title);
    this.menu.close();
    // navigate to the new page if it is not the current page

    // TODO no termino de pillar como hacerlo con reflection asi que ahora a manubrio

    if (page === "ListaGastosPage") {
      this.nav.setRoot(ResumenCuentaPage, { nombre: title });
    } else if (page === "NuevaCuentaPage") {
      this.nav.push(NuevaCuentaPage, { nombre: "" });

    }
  }




  testGapi() {

    this.gapiService.doSomethingGoogley();
  }




}


