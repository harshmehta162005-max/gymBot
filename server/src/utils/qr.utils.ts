import QRCode from 'qrcode';

/**
 * Generate a QR code Data URL (base64 PNG) for attendance scanning.
 * The QR payload is a URL pointing to the attendance endpoint.
 */
export const generateAttendanceQR = async (
  baseUrl: string,
  memberId: string
): Promise<string> => {
  const attendanceUrl = `${baseUrl}/api/attendance/scan?memberId=${memberId}`;
  const qrDataUrl = await QRCode.toDataURL(attendanceUrl, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
  return qrDataUrl;
};
