export type Ip4Array = [ number, number, number, number ];

export interface WledApiJsonConfig {
  rev: [ number, number ],
  vid: number,
  id: {
    mdns: string,
    name: string,
    inv: string,
  },

  nw: {
    ins: [
      {
        ssid: string,
        pskl?: number,
        psk?: string,
        ip: Ip4Array,
        gw: Ip4Array,
        sn: Ip4Array
      }
    ]
  },

  ap: {
    ssid: string,

    /**
     * Password length
     */
    pskl?: number,

    /**
     * Password
     */
    psk?: string,

    chan: number,
    hide: boolean,
    behav: number,
    ip: Ip4Array
  },

  wifi: {
    sleep: boolean // was false
  },

  eth?: {
    type: number,
    pins: number[]
  },

  hw: {
    led: {
      total: number,
      /**
       * Maximum power in milliwatts
       */
      maxpwr: number,
      ledma: number,
      cct: boolean, // was false
      cr: boolean, // was false
      cb: number, // was 0,
      fps: number, // was 42,
      rgbwm: number, // was 3,
      ins: [
        {
          start: number, // was 0,
          len: number, // was 100,
          pin: [
            2
          ],
          order: number, // was 0,
          rev: boolean, // was false
          skip: number, // was 0,
          type: number, // was 22,
          ref: boolean // was false
        }
      ]
    },

    com: Array<{
      start: number,
      len: number,
      order: number,
    }>,
    btn: {
      max: number, // was 4,
      ins: Array<{
        type: number, // was 2
        pin: number[], // had 1
        macros: number[], // was [0,0,0]
      }>, // had 4 entries
      tt: number, // was 32
      mqtt: boolean // was false
    },
    ir: {
      pin: number, // was -1
      type: number, // was 0
      sel: boolean, // was true
    },
    relay: {
      pin: number, // was 12
      rev: boolean // was false
    },
    baud: number, // was 1152
  },
  light: {
    "scale-bri": number, // was 100
    "pal-mode": number, // was 0
    aseg: boolean, // was false
    gc: {
      bri: number, // was 1
      col: number, // was 2.8
    },
    tr: {
      mode: boolean, // was true
      dur: number, // was 70
      pal: number, // was 1
    },
    nl: {
      mode: number, // was 1
      dur: number, // was 60
      tbri: number, // was 0
      macro: number, // was 0
    }
  },
  def: {
    ps: number, // was 1
    on: boolean, // was true
    bri: number, // was 128
  },
  if: {
    sync: {
      port0: number, // was 21324
      port1: number, // was 65506
      recv: {
        bri: boolean, // was true
        col: boolean, // was true
        fx: boolean, // was true
        grp: number, // was 1
        seg: boolean, // was false
        sb: boolean // was false
      },
      send: {
        dir: boolean, // was false
        btn: boolean, // was false
        va: boolean, // was false
        hue: boolean, // was true
        macro: boolean, // was false
        twice: boolean, // was false
        grp: number, // was 1
      }
    },
    nodes: {
      list: boolean, // was true
      bcast: boolean, // was true
    },
    live: {
      en: boolean, // was true
      mso: boolean, // was false
      port: number, // was 5568
      mc: boolean, // was false
      dmx: {
        uni: number, // was 1
        seqskip: boolean, // was false
        addr: number, // was 1
        mode: number, // was 4
      },
      timeout: number, // was 25
      maxbri: boolean, // was false
      "no-gc": boolean, // was true
      offset: number, // was 0
    },
    va: {
      alexa: boolean, // was false
      macros: number[] // was [0,0]
    },
    blynk: {
      token: string, //was ""
      host: string, //was "blynk-cloud.com"
      port: number, // was 80
    },
    mqtt: {
      en: boolean, // was false
      broker: string, //was ""
      port: number, // was 1883
      user: string, //was ""
      pskl: number, // was 0
      cid: string, //was "WLED-4734c4"
      topics: {
        device: string, //was "wled/4734c4"
        group: string, //was "wled/all"
      }
    },
    hue: {
      en: boolean, // was false
      id: number, // was 1
      iv: number, // was 25
      recv: {
        on: boolean, // was true
        bri: boolean, // was true
        col: boolean, // was true
      },
      ip: Ip4Array
    },
    ntp: {
      en: boolean, // was false
      host: string, //was "0.wled.pool.ntp.org"
      tz: number, // was 0
      offset: number, // was 0
      ampm: boolean, // was false
      ln: number, // was 0
      lt: number, // was 0
    }
  },
  ol: {
    clock: number, // was 0
    cntdwn: boolean, // was false
    min: number, // was 0
    max: number, // was 29
    o12pix: number, // was 0
    o5m: boolean, // was false
    osec: boolean // was false
  },
  timers: {
    cntdwn: {
      goal: number[], // was [20,1,1,0,0,0]
      macro: number, // was 0
    },
    ins: []
  },
  ota: {
    lock: boolean, // was false
    "lock-wifi": boolean, // was false
    pskl: number, // was 7
    aota: boolean, // was true
  },
  um: {}
}

export enum AccessPointBehavior {
  AP_BEHAVIOR_BOOT_NO_CONN = 0,
  AP_BEHAVIOR_NO_CONN = 1,
  AP_BEHAVIOR_ALWAYS = 2,
  AP_BEHAVIOR_BUTTON_ONLY = 3,
}

export enum EthernetType {
  WLED_ETH_NONE = 0,
  WLED_ETH_WT32_ETH01 = 1,
  WLED_ETH_ESP32_POE = 2,
  WLED_ETH_WESP32 = 3,
  WLED_ETH_QUINLED = 4,
  WLED_ETH_TWILIGHTLORD = 5,
  WLED_ETH_ESP32DEUX = 6,
}

export enum LedBusType {
  /**
   * light is not configured
   */
  TYPE_NONE = 0,

  /**
   * unused. Might indicate a "virtual" light
   */
  TYPE_RESERVED = 1,

//Digital types (data pin only) (16-31)

  /**
   * white-only chips
   */
  TYPE_WS2812_1CH = 20,

  /**
   * amber + warm + cold white
   */
  TYPE_WS2812_WWA = 21,
  TYPE_WS2812_RGB = 22,

  /**
   * same driver as WS2812, but will require signal 2x per second (else displays test pattern)
   */
  TYPE_GS8608 = 23,

  /**
   * half-speed WS2812 protocol, used by very old WS2811 units
   */
  TYPE_WS2811_400KHZ = 24,
  TYPE_SK6812_RGBW = 30,
  TYPE_TM1814 = 31,
//"Analog" types (PWM) (32-47)

  /**
   * binary output (relays etc.)
   */
  TYPE_ONOFF = 40,

  /**
   * single channel PWM. Uses value of brightest RGBW channel
   */
  TYPE_ANALOG_1CH = 41,

  /**
   * analog WW + CW
   */
  TYPE_ANALOG_2CH = 42,

  /**
   * analog RGB
   */
  TYPE_ANALOG_3CH = 43,

  /**
   * analog RGBW
   */
  TYPE_ANALOG_4CH = 44,

  /**
   * analog RGB + WW + CW
   */
  TYPE_ANALOG_5CH = 45,
//Digital types (data + clock / SPI) (48-63)
  TYPE_WS2801 = 50,
  TYPE_APA102 = 51,
  TYPE_LPD8806 = 52,
  TYPE_P9813 = 53,
//Network types (master broadcast) (80-95)

  /**
   * network DDP RGB bus (master broadcast bus)
   */
  TYPE_NET_DDP_RGB = 80,

  /**
   * network E131 RGB bus (master broadcast bus)
   */
  TYPE_NET_E131_RGB = 81,

  /**
   * network ArtNet RGB bus (master broadcast bus)
   */
  TYPE_NET_ARTNET_RGB = 82,
}

export enum LedHardwareColorOrder {
  // GRB(w),defaut
  COL_ORDER_GRB = 0,
  // Common for WS2811
  COL_ORDER_RGB = 1,
  COL_ORDER_BRG = 2,
  COL_ORDER_RBG = 3,
  COL_ORDER_BGR = 4,
  COL_ORDER_GBR = 5,
  COL_ORDER_MAX = 5,
}
