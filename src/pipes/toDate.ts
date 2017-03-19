import {Pipe, PipeTransform} from '@angular/core';

// We use the @Pipe decorator to register the name of the pipe
@Pipe({
  name: 'toDate'
})
// The work of the pipe is handled in the tranform method with our pipe's class
export class ToDatePipe implements PipeTransform {
  transform(value: string) {
    if (value && value.length >= 10) {
      var fecha = new Date(value).toLocaleDateString();
      return fecha;
    }

    return;
  }
}
