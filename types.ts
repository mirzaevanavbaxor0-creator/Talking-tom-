
export enum TomState {
  IDLE = 'IDLE',
  TALKING = 'TALKING',
  HAPPY = 'HAPPY',
  SURPRISED = 'SURPRISED',
  EATING = 'EATING'
}

export enum GameMode {
  MAIN = 'MAIN',
  MEMORY = 'MEMORY',
  RHYTHM = 'RHYTHM',
  PUZZLE = 'PUZZLE'
}

export interface Blob {
  data: string;
  mimeType: string;
}
