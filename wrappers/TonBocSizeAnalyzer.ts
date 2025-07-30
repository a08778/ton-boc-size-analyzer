import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type TonBocSizeAnalyzerConfig = {};

export function tonBocSizeAnalyzerConfigToCell(config: TonBocSizeAnalyzerConfig): Cell {
    return beginCell().endCell();
}

export const OPCODES = {
    FILL_STORAGE: 0xc1e1bc59
};

export enum ExitCode {
    Success = 0,
    SuccessAlt = 1
}

export class TonBocSizeAnalyzer implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) { }

    static createFromAddress(address: Address) {
        return new TonBocSizeAnalyzer(address);
    }

    static createFromConfig(config: TonBocSizeAnalyzerConfig, code: Cell, workchain = 0) {
        const data = tonBocSizeAnalyzerConfigToCell(config);
        const init = { code, data };
        return new TonBocSizeAnalyzer(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendFillStorage(provider: ContractProvider, via: Sender, value: bigint, data: Cell) {

        var body = beginCell()
            .storeUint(OPCODES.FILL_STORAGE, 32)
            .storeRef(data)
            .endCell();

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: body
        });
    }

    async getResultsForCell(provider: ContractProvider, maxDepth: bigint) {
        const { stack } = await provider.get('get_results_for_cell', [
            { type: 'int', value: maxDepth },
        ])

        return {
            uniqueCells: stack.readNumberOpt(),
            dataBits: stack.readNumberOpt(),
            references: stack.readNumberOpt(),
            success: stack.readNumber() == -1
        }
    }

    async getResultsForSlice(provider: ContractProvider, maxDepth: bigint) {
        const { stack } = await provider.get('get_results_for_slice', [
            { type: 'int', value: maxDepth },
        ])

        return {
            uniqueCells: stack.readNumberOpt(),
            dataBits: stack.readNumberOpt(),
            references: stack.readNumberOpt(),
            success: stack.readNumber() == -1
        }
    }
}