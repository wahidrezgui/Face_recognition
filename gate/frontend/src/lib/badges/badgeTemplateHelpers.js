import QRCode from 'qrcode-generator';
import { buildZoneSvgMarkup, needsAutoContrastLine, normalizeZone } from '../zones/zoneStyleCore.js';

export function replaceTemplateValues(template, values) {
    let result = template;
    for (const key in values) {
        if (Object.hasOwnProperty.call(values, key)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, values[key] ?? '');
        }
    }
    return result;
}

export function generateQRCode(text, { size = 300, dataUrlScale = 15 } = {}) {
    const qr = QRCode(0, 'L');
    qr.addData(text ?? '');
    qr.make();
    return `<img src="${qr.createDataURL(dataUrlScale)}" alt="QR Code" width="${size}" height="${size}" />`;
}

const DEFAULT_PHOTO_PX = 80;

function resolvePhotoSizeAndShape(sizeOrShape, shape = 'rounded-square') {
    if (typeof sizeOrShape === 'string') {
        const shapeMap = {
            circle: 'circle',
            square: 'rounded-square',
            'rounded-square': 'rounded-square',
        };

        if (shapeMap[sizeOrShape]) {
            return {
                size: DEFAULT_PHOTO_PX,
                shape: shapeMap[sizeOrShape],
            };
        }
    }

    const parsedSize = Number(sizeOrShape);
    return {
        size: Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : DEFAULT_PHOTO_PX,
        shape,
    };
}

export function generatePhoto(path, sizeOrShape = DEFAULT_PHOTO_PX, shape = 'rounded-square') {
    const resolved = resolvePhotoSizeAndShape(sizeOrShape, shape);
    const photo = path ? `/${path}` : '/uploads/nopic.png';
    const radius = resolved.shape === 'rounded-square' ? '5%' : '50%';
    return `<img src="${photo}" alt="Photo" style="width: ${resolved.size}px; height: ${resolved.size}px; border-radius: ${radius}; object-fit: cover;" />`;
}

export function generatePhotot(path, sizeOrShape = DEFAULT_PHOTO_PX, shape = 'rounded-square') {
    const resolved = resolvePhotoSizeAndShape(sizeOrShape, shape);
    const photo = path ? `/${path}` : '/uploads/nopic.png';
    const radius = resolved.shape === 'rounded-square' ? '5%' : '50%';
    return `<img src="${photo}" alt="Photot" style="width: ${resolved.size}px; height: ${resolved.size}px; border-radius: ${radius}; object-fit: cover;" />`;
}

export function generatePhoto2(path, sizeOrShape = DEFAULT_PHOTO_PX, shape = 'rounded-square') {
    const resolved = resolvePhotoSizeAndShape(sizeOrShape, shape);
    if (!path) {
        return '/uploads/nopic.png';
    }
    const radius = resolved.shape === 'rounded-square' ? '5%' : '50%';
    return `<img src="/${path}" alt="Photo" style="width: ${resolved.size}px; height: ${resolved.size}px; border-radius: ${radius}; object-fit: cover;" />`;
}

export function generatePreviewPhoto(pic, shape = 'circle') {
    const photo = pic ? `/uploads/${pic}` : '/uploads/nopic.png';
    const shapeClass = shape === 'circle' ? 'rounded-circle' : 'rounded-square';
    return `<img src="${photo}" alt="Photo" class="${shapeClass}" />`;
}

export function generatePlateNumbers(plateNumbers, separator = ' // ') {
    if (!plateNumbers || plateNumbers.length === 0) {
        return '';
    }
    return plateNumbers.join(separator);
}

export function needsWhiteLine(color) {
    return needsAutoContrastLine(color);
}

export function generateZone(zones, { useSvg = true } = {}) {
    if (!zones || zones.length === 0) {
        return '';
    }

    if (!useSvg) {
        let zoning = '<ul style="list-style:none; padding: 0px 0px 0px 0px;">';
        zones.forEach((item) => {
            const normalized = normalizeZone(item);
            zoning += `<li style="display:inline-block; margin-left:10px; width: 25px; height: 20px; background-color:${normalized.color};"></li>`;
        });
        zoning += '</ul>';
        return zoning;
    }

    let zoning = '<ul style="list-style:none; padding: 0px 0px 0px 0px;">';
    zones.forEach((item) => {
        const svg = buildZoneSvgMarkup(item, { width: 25, height: 20, strokeWidth: 3 });
        zoning += `<li style="display: inline-block; margin-left: 10px; width: 25px; height: 20px;">${svg}</li>`;
    });
    zoning += '</ul>';
    return zoning;
}

export function generatePreviewZone() {
    return '<span style="width:40px; height:10px; border-radius:20px; background-color:#ff0000; position:absolute;"></span> <span style="width:20px; height:10px; border-radius:4px; background-color:#E7DF04; position:absolute;"></span>';
}

export function buildBadgeTemplateValues(data, { plateSeparator = ' // ', qrSize = 300 } = {}) {
    return {
        qrcode: generateQRCode(data.qrcode, { size: qrSize }),
        guest_photo_circle: generatePhoto(data.photo, 'circle'),
        guest_photo_square: generatePhoto(data.photo, 'square'),
        guest_photo_circlet: generatePhotot(data.photot, 'circle'),
        guest_photo_squaret: generatePhotot(data.photot, 'square'),
        guest_photo_circleb: generatePhoto2(data.base_photo, 'circle'),
        guest_photo_squareb: generatePhoto2(data.base_photo, 'square'),
        fullname_en: data.fullname_en ?? '',
        fullname_ar: data.fullname_ar ?? '',
        Job_En: data.Job_En ?? '',
        Job_Arabic: data.Job_Arabic ?? '',
        department: data.department ?? '',
        rank: data.rank ?? '',
        ranke: data.ranke ?? '',
        bloodtype: data.bloodtype ?? '',
        military_number: data.military_number ?? '',
        default_base: data.default_base ?? '',
        zones: generateZone(data.ZoneColor),
        expiry_date: data.expiry_date ?? '',
        plate_numbers: generatePlateNumbers(data.plate_numbers, plateSeparator),
        plate_number: generatePlateNumbers(data.plate_numbers, plateSeparator),
        remarks: data.remarks ?? '',
        Escort: data.Escort ?? '',
        device: data.device ?? '',
        StartTime: data.StartTime ?? '',
        EndTime: data.EndTime ?? '',
        dep_id: data.dep_id ?? '',
        dep_name: data.dep_name ?? '',
        dep3: data.dep3 ?? '',
        nationality: data.nationality ?? '',
        nationalitye: data.nationalitye ?? '',
        idguest: data.idguest || data.id || '',
    };
}
