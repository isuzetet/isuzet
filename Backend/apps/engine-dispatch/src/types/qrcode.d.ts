declare module 'qrcode' {
  interface QRCodeOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    type?: 'image/png' | 'image/jpeg' | 'image/webp';
    quality?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  function toDataURL(data: string, options?: QRCodeOptions): Promise<string>;
  function toString(data: string, options?: QRCodeOptions): Promise<string>;

  export { toDataURL, toString };
  export default { toDataURL, toString };
}
