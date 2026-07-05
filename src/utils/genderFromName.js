// Infiere el género probable de un nombre en español/inglés.
// El escenario de la IA no trae campo de género, pero la coherencia
// nombre ↔ avatar ↔ voz es clave para la inmersión del roleplay.
// Sincronizar con: sales-arena-mobile/src/utils/genderFromName.js

const FEMALE = new Set(['maria','ana','laura','sofia','valentina','camila','lucia','martina','julia','carla','paula','florencia','agustina','daniela','gabriela','veronica','monica','andrea','marta','elena','isabel','isabela','carolina','victoria','emma','olivia','mia','catalina','rocio','milagros','guadalupe','brenda','romina','natalia','patricia','alejandra','fernanda','jimena','josefina','pilar','celeste','silvia','claudia','susana','beatriz','raquel','irene','noelia','vanesa','yamila','antonella','mariana','cecilia','lorena','sandra','karina','viviana','sarah','mary','jennifer','linda','emily','jessica','ashley','amanda','lisa','karen','nancy','betty','helen','donna','michelle','carol','amy','angela','anna','rebecca','kathleen','sharon','cynthia','kathryn','janet','sara','grace','judy','sophia','isabella','charlotte','amelia','harper','evelyn','abigail','ella','scarlett','chloe','lily','hannah','zoe']);
const MALE = new Set(['juan','jose','luis','carlos','jorge','pedro','diego','pablo','martin','matias','nicolas','sebastian','alejandro','fernando','ricardo','roberto','miguel','raul','oscar','hernan','gonzalo','federico','marcelo','gustavo','sergio','andres','cristian','mauro','lucas','tomas','joaquin','facundo','agustin','ramiro','bruno','marcos','david','daniel','gabriel','leandro','maximiliano','ezequiel','ivan','damian','franco','emiliano','santiago','rodrigo','luca','elias','jeremias','tobias','isaias','jonas','borja','sasha','esteban','mariano','ariel','walter','hugo','ruben','victor','manuel','francisco','javier','alberto','eduardo','antonio','james','john','robert','michael','william','richard','joseph','thomas','charles','christopher','matthew','anthony','mark','donald','steven','paul','andrew','joshua','kenneth','kevin','brian','george','timothy','ronald','jason','edward','jeffrey','ryan','jacob','nicholas','eric','jonathan','stephen','larry','justin','scott','brandon','benjamin','samuel','henry','liam','noah','oliver','elijah','mason','logan','ethan']);

export function inferGender(fullName = '') {
  const first = (fullName || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // sin tildes
    .split(/\s+/)[0] || '';
  if (FEMALE.has(first)) return 'female';
  if (MALE.has(first)) return 'male';
  // Heurística español: terminación en 'a' suele ser femenino
  if (first.endsWith('a')) return 'female';
  return 'male';
}
