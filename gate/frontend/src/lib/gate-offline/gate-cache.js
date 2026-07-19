import { gateDb, ensureGateDbMigrated } from './gate-db';
import { getPendingMovements } from './sync-engine';

function normalizeGate(gate) {
    return {
        id: Number(gate?.id),
        name_ar: gate?.name_ar ?? gate?.name ?? '',
    };
}

function normalizeGateConfig(config) {
    const gatesSource = Array.isArray(config.gates)
        ? config.gates
        : Array.isArray(config.gates?.value)
            ? config.gates.value
            : [];

    return {
        base_id: Number(config.base_id) || null,
        base_name: String(config.base_name ?? ''),
        gate_id: config.gate_id != null ? Number(config.gate_id) : null,
        gates: gatesSource.map(normalizeGate).filter((gate) => gate.id),
    };
}

function employeeToGateCard(employee) {
    return {
        emp_id: employee.id,
        military_number: employee.military_number,
        qrcode: employee.qrcode,
        photo: employee.photo,
        fullname_en: employee.fullname_en,
        fullname_ar: employee.fullname_ar,
        department: employee.department,
        rank: employee.rank_name_ar,
        rank_name_ar: employee.rank_name_ar,
        expiry_date: employee.expiry_date,
        remarks: employee.remarks,
        last_movement_type: employee.last_movement_type,
        alerts: employee.alerts ?? [],
        is_expired: Boolean(employee.is_expired),
        offline_cached: true,
    };
}

function movementTypeToLast(mvtype) {
    if (mvtype === 'Check-In') return 'in';
    if (mvtype === 'Check-Out') return 'out';
    return null;
}

export async function overlayPendingMovements(empId, card) {
    const pending = await getPendingMovements();
    const forEmployee = pending
        .filter((row) => {
            const id = row.emp_id ?? row.empl_id;
            return Number(id) === Number(empId);
        })
        .sort((a, b) => {
            const aTime = new Date(a.queued_at ?? 0).getTime();
            const bTime = new Date(b.queued_at ?? 0).getTime();
            return aTime - bTime;
        });

    if (!forEmployee.length) {
        return card;
    }

    const last = forEmployee[forEmployee.length - 1];
    return {
        ...card,
        last_movement_type: movementTypeToLast(last.mvtype) ?? card.last_movement_type,
    };
}

export async function lookupGateCardByQrcode(qrcode) {
    await ensureGateDbMigrated();
    const needle = String(qrcode ?? '').trim();
    if (!needle) {
        return null;
    }

    const employee = await gateDb.employees.where('qrcode').equals(needle).first();
    if (!employee) {
        return null;
    }

    const card = employeeToGateCard(employee);
    return overlayPendingMovements(employee.id, card);
}

export async function lookupGateCardByEmployeeId(employeeId) {
    await ensureGateDbMigrated();
    const id = Number(employeeId);
    if (!id) {
        return null;
    }

    const employee = await gateDb.employees.get(id);
    if (!employee) {
        return null;
    }

    const card = employeeToGateCard(employee);
    return overlayPendingMovements(id, card);
}

export async function saveGateConfig(config) {
    await ensureGateDbMigrated();
    const normalized = normalizeGateConfig(config);
    await gateDb.gateConfig.put({
        id: 'default',
        base_id: normalized.base_id,
        base_name: normalized.base_name,
        gate_id: normalized.gate_id,
        gates_json: JSON.stringify(normalized.gates),
        cached_at: new Date().toISOString(),
    });
}

export async function loadGateConfig() {
    await ensureGateDbMigrated();
    const row = await gateDb.gateConfig.get('default');
    if (!row) {
        return null;
    }

    let gates = [];
    if (row.gates_json) {
        try {
            gates = JSON.parse(row.gates_json);
        } catch {
            gates = [];
        }
    } else if (Array.isArray(row.gates)) {
        gates = row.gates.map(normalizeGate);
    }

    return {
        base_id: row.base_id,
        base_name: row.base_name,
        gate_id: row.gate_id,
        gates,
        cached_at: row.cached_at,
    };
}
