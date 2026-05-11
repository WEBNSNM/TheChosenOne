declare module 'lunar-javascript' {
  export interface SolarDate {
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getMinute(): number;
    getSecond(): number;
    getLunar(): LunarDate;
    toString(): string;
  }

  export interface LunarDate {
    getSolar(): SolarDate;
    getEightChar(): EightChar;
    getDayYi(sect?: number): string[];
    getDayJi(sect?: number): string[];
    getDayJiShen(): string[];
    getDayXiongSha(): string[];
    getDayInGanZhi(): string;
    getDayShengXiao(): string;
    getChongDesc(): string;
    getSha(): string;
    getLiuYao(): string;
    getZhiXing(): string;
    getDayTianShen(): string;
    getDayTianShenType(): string;
    toString(): string;
  }

  export interface EightChar {
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    toString(): string;
  }

  export const Solar: {
    fromDate(date: Date): SolarDate;
    fromYmd(year: number | string, month: number | string, day: number | string): SolarDate;
    fromYmdHms(
      year: number | string,
      month: number | string,
      day: number | string,
      hour: number | string,
      minute: number | string,
      second: number | string,
    ): SolarDate;
  };

  export const Lunar: {
    fromYmd(year: number | string, month: number | string, day: number | string): LunarDate;
    fromYmdHms(
      year: number | string,
      month: number | string,
      day: number | string,
      hour: number | string,
      minute: number | string,
      second: number | string,
    ): LunarDate;
  };
}
