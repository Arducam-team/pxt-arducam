
namespace Arducam {
    const ARDUCHIP_TEST1 = 0x00;
    const ARDUCHIP_FIFO  = 0x04;  //FIFO and I2C control
    const FIFO_CLEAR_MASK = 0x01;
    const FIFO_START_MASK = 0x02;
    const ARDUCHIP_TRIG = 0x41;
    const CAP_DONE_MASK = 0x08;
    const FIFO_SIZE1	= 0x42  //Camera write FIFO size[7:0] for burst to read
    const FIFO_SIZE2	= 0x43  //Camera write FIFO size[15:8]
    const FIFO_SIZE3	= 0x44  //Camera write FIFO size[18:16]
    const MAX_FIFO_SIZE = 0x5FFFF
    const BURST_FIFO_READ = 0x3C

    function writeReg(addr: number, data: number) {
        pins.digitalWritePin(DigitalPin.P0, 0);
        pins.spiWrite(addr | 0x80);
        pins.spiWrite(data);
        pins.digitalWritePin(DigitalPin.P0, 1);
    }

    function readReg(addr: number) {
        pins.digitalWritePin(DigitalPin.P0, 0);
        pins.spiWrite(addr);
        let value = pins.spiWrite(0x00)
        pins.digitalWritePin(DigitalPin.P0, 1); 
        
        return value;

    }
    interface reg {
        addr: number,
        value: number
    }
    



    function wrSensorReg8_8(id: number, data: number) {
        let buffer = pins.createBuffer(2)
        buffer.setUint8(0, id)
        buffer.setUint8(1, data)
        pins.i2cWriteBuffer(0x30, buffer)
    }

    function wrSensorRegs8_8(regs: SensorReg[]) {
        regs.forEach(function (reg: SensorReg, index: number) {
          wrSensorReg8_8(reg.addr, reg.value)
        })
    } 

    function readFrame() {
        // get length
        let length = ((readReg(FIFO_SIZE3) << 16) | (readReg(FIFO_SIZE2) << 8) | readReg(FIFO_SIZE1)) & 0x07fffff;
        if (length >= MAX_FIFO_SIZE || length == 0) {
            return
        }
        pins.digitalWritePin(DigitalPin.P0, 0)
        pins.spiWrite(BURST_FIFO_READ)
        while (length--) {
            let buf = pins.createBuffer(1)
            buf.setUint8(0, pins.spiWrite(0))
            serial.writeBuffer(buf)
        }
        pins.digitalWritePin(DigitalPin.P0, 1)
        return;
    }


    export enum IMAGE_FORMAT {
        BMP = 0x00,
        JPEG = 0x01,
        RAW = 0x02,
    }

    export enum IMAGE_RESOLUTION {
         
        OV2640_320x240 = 2, 
         OV2640_640x480 = 4	, 
         OV2640_800x600 = 5	, 
         OV2640_1600x1200 = 8,
    }




    /**
     * Init Camera First
     * @param pin share pin
     * @param format image fromat
     */
    //% blockId=camera_init block="Init Camera with format $format and resolution $reso"
    export function initCamera(format: IMAGE_FORMAT, reso: IMAGE_RESOLUTION) {
        pins.digitalWritePin(DigitalPin.P0, 1);
        writeReg(0x07, 0x80);
        basic.pause(100);
        writeReg(0x07, 0x00);
        basic.pause(100);

        while(true) {
            writeReg(ARDUCHIP_TEST1, 0x55);
            let value = readReg(ARDUCHIP_TEST1);
            if (value != 0x55) {
                basic.showIcon(IconNames.Sad)
                basic.pause(1000); 
                basic.clearScreen();
                continue;
            } else {
                basic.showIcon(IconNames.Happy)
                break;
            }
        }

        wrSensorReg8_8(0xff, 0x01)
        // wrSensorReg8_8(0x12, 0x80)
        basic.pause(100);
        // format = IMAGE_FORMAT.JPEG
        if (format == IMAGE_FORMAT.JPEG) {
            wrSensorRegs8_8(OV2640_JPEG_INIT)
            wrSensorRegs8_8(OV2640_YUV422);
            wrSensorRegs8_8(OV2640_JPEG);
            wrSensorReg8_8(0xff, 0x01);
            wrSensorReg8_8(0x15, 0x00);
            wrSensorRegs8_8(OV2640_320x240_JPEG);

        } else {
            // wrSensorRegs8_8(OV2640_QVGA);
        }
    }

    /**
     * capture
     */
    //% blockId=camera_capture block="capture"
    export function capture() {
        writeReg(ARDUCHIP_FIFO, FIFO_CLEAR_MASK);
        writeReg(ARDUCHIP_FIFO, FIFO_START_MASK);

        while(!(readReg(ARDUCHIP_TRIG) & CAP_DONE_MASK)) {
            // wait capture finished
        }
        readFrame();
        
    }

    
    
}