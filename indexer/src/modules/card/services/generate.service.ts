import { Inject, Injectable } from '@nestjs/common';

import { Web3Service } from '@/modules/shared/services/web3.service';

import { Image, createCanvas, registerFont } from 'canvas';
import { readFile, writeFile } from 'fs/promises';

import path from 'path';

import { stringify } from 'svgson';

@Injectable()
export class GenerateService {

  constructor(
    @Inject('WEB3_SERVICE_L1') private readonly web3Svc: Web3Service,
  ) {}

  async createCard(tokenId: string): Promise<any> {

    // Get the root path of the project
    const rootPath = path.join(__dirname, '../../../../src');
    registerFont(path.join(rootPath, '_static/retro-computer.ttf'), { family: 'RetroComputer' });

    const canvasWidth = 800 * 2;
    const canvasHeight = 418 * 2;
    const bleed = 35 * 2;

    const rightSide = (canvasWidth / 2) + bleed;

    const phunkSize = canvasHeight - (bleed * 2);

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // const punkData = await this.web3Svc.punkDataContract['punkImage'](parseInt(phunkId).toString());
    const [ punkImage, punkTraits ] = await Promise.all([
      this.web3Svc.getPunkImage(+tokenId),
      this.web3Svc.getPunkAttributes(+tokenId)
    ]);

    const svg = await this.createPhunkSvg(punkImage, phunkSize, phunkSize);

    const textColor = 'rgb(255, 255, 255)';
    const baseColor = 'rgb(195, 255, 0)';
    const pink = 'rgb(255, 4, 180)';

    ctx.fillStyle = pink;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = '#03FF64';
    ctx.fillRect(
      bleed + 20,
      bleed + 20,
      rightSide - (bleed * 2),
      canvasHeight - (bleed * 2)
    );

    ctx.fillStyle = baseColor;
    ctx.fillRect(
      bleed,
      bleed,
      rightSide - (bleed * 2),
      canvasHeight - (bleed * 2)
    );

    // ctx.fillStyle = color;
    // ctx.fillRect(
    //   rightSide,
    //   bleed,
    //   rightSide - (bleed * 3),
    //   canvasHeight - (bleed * 2)
    // );

    const image = await new Promise<Image>((resolve) => {
      const img = new Image() as Image;
      img.onload = () => {
        resolve(img);
      };
      img.onerror = err => { throw err };
      img.src = Buffer.from(svg);
    });

    ctx.drawImage(
      image,
      (rightSide / 2) - (phunkSize / 2) - (bleed / 2),
      canvasHeight - phunkSize - bleed
    );

    // Line 1 (left side)
    const line1Pos = bleed;
    const line1 = 'Ethereum Phunk';
    ctx.textBaseline = 'top';
    ctx.font = 'normal 40px RetroComputer';
    ctx.fillStyle = textColor;
    ctx.fillText(
      line1,
      rightSide,
      line1Pos
    );

    // Line 2 (left side)
    ctx.font = 'normal 132px RetroComputer';
    ctx.fillStyle = baseColor;
    ctx.fillText(
      ('0000' + tokenId).slice(-4),
      rightSide - 6,
      line1Pos + 20
    );

    const phunkTraitData = this.getTraits(punkTraits);
    const sex = phunkTraitData.traits.filter((tr) => tr.label === phunkTraitData.sex)[0];

    // Line 2
    const line2Pos = line1Pos + 220;
    const line2_1 = `One of`;
    ctx.font = 'normal 28px RetroComputer';
    ctx.textAlign = 'left';
    ctx.fillStyle = textColor;
    ctx.fillText(
      line2_1,
      rightSide,
      line2Pos
    );

    const line2_1Width = (ctx.measureText(line2_1).width + 8);
    const line2_2 = `${sex.value}`;
    ctx.font = 'normal 28px RetroComputer';
    ctx.textAlign = 'left';
    ctx.fillStyle = baseColor;
    ctx.fillText(
      line2_2,
      rightSide + line2_1Width,
      line2Pos
    );

    const line2_2Width = (ctx.measureText(line2_2).width + 8);
    const line2_3 = `${phunkTraitData.sex} phunks`;
    ctx.font = 'normal 28px RetroComputer';
    ctx.textAlign = 'left';
    ctx.fillStyle = textColor;
    ctx.fillText(
      line2_3,
      rightSide + line2_1Width + line2_2Width,
      line2Pos
    );

    // Line 3
    const line3Pos = line2Pos + 50;
    const line3_1 = `${phunkTraitData.traitCount}`;
    ctx.font = 'normal 28px RetroComputer';
    ctx.textAlign = 'left';
    ctx.fillStyle = textColor;
    ctx.fillText(
      line3_1,
      rightSide,
      line3Pos
    );

    const line3_1Width = (ctx.measureText(line3_1).width + 8);
    const line3_2 = `Trait${phunkTraitData.traits?.length > 2 ? 's' : ''}`
    ctx.font = 'normal 28px RetroComputer';
    ctx.textAlign = 'left';
    ctx.fillStyle = textColor;
    ctx.fillText(
      line3_2,
      rightSide + line3_1Width,
      line3Pos
    );

    // Draw a line under the text
    ctx.beginPath();
    ctx.moveTo(rightSide, line3Pos + bleed + 30);
    ctx.lineTo(canvasWidth - bleed, line3Pos + bleed + 30);
    ctx.strokeStyle = textColor;
    ctx.globalAlpha = 0.1;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // const phreePhunky = await readFile(path.join(__dirname, '../static/phree-phunky.svg'), { encoding: 'utf8' });

    // await new Promise<void>((resolve) => {
    //   const phreePhunkyImg = new Image();
    //   phreePhunkyImg.onload = () => {
    //     ctx.drawImage(
    //       phreePhunkyImg,
    //       rightSide,
    //       canvasHeight - (bleed + 50),
    //       369 / 1.5,
    //       24 / 1.5
    //     );
    //     resolve();
    //   };
    //   phreePhunkyImg.onerror = err => { throw err };
    //   phreePhunkyImg.src = Buffer.from(phreePhunky);
    // });

    const buffer = canvas.toBuffer('image/png');
    await writeFile(path.join(__dirname, `../../../../${tokenId}.png`), buffer);
    // return { base64: buffer.toString('base64'), color: tinyColor(color).toHex() };
  }

  // Create SVG from punk data
  async createPhunkSvg(punkData: string, width: number, height: number): Promise<any> {

    const phunkArr = punkData?.replace('0x', '').match(/.{1,8}/g) as string[];

    const svg = {
      name: 'svg',
      type: 'element',
      value: '',
      attributes: {
        xmlns: 'http://www.w3.org/2000/svg',
        version: '1.2',
        viewBox: '0 0 24 24',
        width: width.toString(),
        height: height.toString()
      },
      children: phunkArr.map((res, i) => {
        return {
          name: 'rect',
          type: 'element',
          value: '',
          attributes: {
            x: `${-(i % 24) + 24}`,
            y: `${Math.floor(i / 24)}`,
            width: '1',
            height: '1',
            'shape-rendering': 'crispEdges',
            fill: `#${res}`
          },
          children: []
        }
      })
    };

    return stringify(svg);
  }

  // Get traits for specified phunk
  getTraits(punkTraits: string): any {

    const traits = transformAttributes(punkTraits);

    function transformAttributes(attributes: string) {
      return attributes.split(', ').map((res: any, i: number) => {
        if (!i) return res.match(/[a-zA-Z]+/g)[0];
        return res;
      });
    }

    const values = {'Female':3840,'Earring':2459,'Green Eye Shadow':271,'Blonde Bob':147,'Male':6039,'Smile':238,'Mohawk':441,'Wild Hair':447,'Pipe':317,'Nerd Glasses':572,'Goat':295,'Big Shades':535,'Purple Eye Shadow':262,'Half Shaved':147,'Do-rag':300,'Clown Eyes Blue':384,'Spots':124,'Wild White Hair':136,'Messy Hair':460,'Luxurious Beard':286,'Big Beard':146,'Clown Nose':212,'Police Cap':203,'Blue Eye Shadow':266,'Straight Hair Dark':148,'Black Lipstick':617,'Clown Eyes Green':382,'Purple Lipstick':655,'Blonde Short':129,'Straight Hair Blonde':144,'Pilot Helmet':54,'Hot Lipstick':696,'Regular Shades':527,'Stringy Hair':463,'Small Shades':378,'Frown':261,'Eye Mask':293,'Muttonchops':303,'Bandana':481,'Horned Rim Glasses':535,'Crazy Hair':414,'Classic Shades':502,'Handlebars':263,'Mohawk Dark':429,'Dark Hair':157,'Peak Spike':303,'Normal Beard Black':289,'Cap':351,'VR':332,'Frumpy Hair':442,'Cigarette':961,'Normal Beard':292,'Red Mohawk':147,'Shaved Head':300,'Chinstrap':282,'Mole':644,'Knitted Cap':419,'Fedora':186,'Shadow Beard':526,'Straight Hair':151,'Hoodie':259,'Eye Patch':461,'Headband':406,'Cowboy Hat':142,'Tassle Hat':178,'3D Glasses':286,'Mustache':288,'Vape':272,'Choker':48,'Pink With Hat':95,'Welding Goggles':86,'Vampire Hair':147,'Mohawk Thin':441,'Tiara':55,'Zombie':88,'Front Beard Dark':260,'Cap Forward':254,'Gold Chain':169,'Purple Hair':165,'Beanie':44,'Clown Hair Green':148,'Pigtails':94,'Silver Chain':156,'Front Beard':273,'Rosy Cheeks':128,'Orange Side':68,'Wild Blonde':144,'Buck Teeth':78,'Top Hat':115,'Medical Mask':175,'Ape':24,'Alien':9};

    return {
      sex: traits[0],
      traits: traits.map((trait) => ({ label: trait, value: values[trait] })),
      traitCount: traits.length - 1,
    };
  }

  millisecondsToTimeFormat(ms: number): string {
    if (ms < 0) ms = 0;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

}
