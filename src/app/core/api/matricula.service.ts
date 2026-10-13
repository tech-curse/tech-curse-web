import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CONFIGURACAO } from '../configuracao/configuracao';

@Injectable({ providedIn: 'root' })
export class MatriculaService {
  private readonly apiUrl = inject(CONFIGURACAO).apiUrl;
  private readonly http = inject(HttpClient);

  async matricular(courseId: number, studentId: number): Promise<void> {
    await firstValueFrom(this.http.post(`${this.apiUrl}/Enrollment`, { courseId, studentId }));
  }
}
