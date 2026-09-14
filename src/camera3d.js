import * as THREE from '../vendor/three.module.min.js';
export const CAMERA_ELEVATION=52*Math.PI/180;
export const GROUND_COMPRESSION=Math.sin(CAMERA_ELEVATION);
export const SHOT_HEIGHT=43;
export function screenVectorToGround(x,y){const amount=Math.min(1,Math.hypot(x,y));const gy=y/GROUND_COMPRESSION,n=Math.hypot(x,gy)||1;return{x:x/n*amount,y:gy/n*amount};}
export function makeCamera(){return new THREE.OrthographicCamera(-800,800,500,-500,1,6000);}
export function positionCamera(camera,x,y){camera.position.set(x,Math.sin(CAMERA_ELEVATION)*2000,y+Math.cos(CAMERA_ELEVATION)*2000);camera.lookAt(x,0,y);camera.updateMatrixWorld(true);}
export function sizeCamera(camera,w,h,span=null){const scale=span?w/span:Math.max(w/1680,h/1080);const width=w/scale,height=h/scale;camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();return scale;}
