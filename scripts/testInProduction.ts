import { toNano, beginCell, OpenedContract, Cell } from '@ton/core';
import { TonBocSizeAnalyzer } from '../wrappers/TonBocSizeAnalyzer';
import { compile, NetworkProvider } from '@ton/blueprint';

export type Expectation = {};

export async function run(provider: NetworkProvider) {
    const tonBocSizeAnalyzer = provider.open(TonBocSizeAnalyzer.createFromConfig({}, await compile('TonBocSizeAnalyzer')));

    let root, cell_1, cell_2, the_same_cell, cell_1_1, cell_2_1, bottom_cell_1, bottom_cell_2;
    let expected : Expectation;

    root = beginCell().endCell();
    expected = {
        uniqueCells: 1,
        dataBits: 0,
        references: 0,
        success: true
    };
    await execute(root, BigInt(10), 'An empty cell', expected, tonBocSizeAnalyzer, provider);

    root = beginCell().storeStringTail("value 1").endCell();  
    expected = {
        uniqueCells: 1,
        dataBits: 56,
        references: 0,
        success: true
    };
    await execute(root, BigInt(10), 'Not empty celll', expected, tonBocSizeAnalyzer, provider);

    cell_1 = beginCell().endCell();
    root = beginCell().storeRef(cell_1).endCell();  
    expected = {
        uniqueCells: 2,
        dataBits: 0,
        references: 1,
        success: true
    };
    await execute(root, BigInt(10), 'One reference', expected, tonBocSizeAnalyzer, provider);

    cell_2 = beginCell().endCell();
    cell_1 = beginCell().endCell();
    root = beginCell().storeRef(cell_1).storeRef(cell_2).endCell();  
    expected = {
        uniqueCells: 2,
        dataBits: 0,
        references: 2,
        success: true
    };
    await execute(root, BigInt(10), 'No references / no value', expected, tonBocSizeAnalyzer, provider);

    cell_2 = beginCell().storeUint(0,1).endCell();
    cell_1 = beginCell().storeUint(0,1).endCell();
    root = beginCell().storeRef(cell_1).storeRef(cell_2).endCell();  
    expected = {
        uniqueCells: 2,
        dataBits: 1,
        references: 2,
        success: true
    };
    await execute(root, BigInt(10), 'No references / the same value', expected, tonBocSizeAnalyzer, provider);

    cell_2 = beginCell().storeUint(1,1).endCell();
    cell_1 = beginCell().storeUint(0,1).endCell();
    root = beginCell().storeRef(cell_1).storeRef(cell_2).endCell();  
    expected = {
        uniqueCells: 3,
        dataBits: 2,
        references: 2,
        success: true
    };
    await execute(root, BigInt(10), 'No references / different values', expected, tonBocSizeAnalyzer, provider);

    the_same_cell = beginCell().endCell();
    cell_2 = beginCell().storeRef(the_same_cell).endCell();
    cell_1 = beginCell().storeRef(the_same_cell).endCell();
    root = beginCell().storeRef(cell_1).storeRef(cell_2).endCell();  
    expected = {
        uniqueCells: 3,
        dataBits: 0,
        references: 3,
        success: true
    };
    await execute(root, BigInt(10), 'References to the same cel', expected, tonBocSizeAnalyzer, provider);

    cell_2_1 = beginCell().endCell();
    cell_1_1 = beginCell().endCell();
    cell_2 = beginCell().storeRef(cell_2_1).endCell();
    cell_1 = beginCell().storeRef(cell_1_1).endCell();
    root = beginCell().storeRef(cell_1).storeRef(cell_2).endCell();  
    expected = {
        uniqueCells: 3,
        dataBits: 0,
        references: 3,
        success: true
    };
    await execute(root, BigInt(10), 'References to identical cells', expected, tonBocSizeAnalyzer, provider);

    cell_2_1 = beginCell().storeUint(1, 1).endCell();
    cell_1_1 = beginCell().storeUint(0, 1).endCell();
    cell_2 = beginCell().storeRef(cell_2_1).endCell();
    cell_1 = beginCell().storeRef(cell_1_1).endCell();
    root = beginCell().storeRef(cell_1).storeRef(cell_2).endCell();  
    expected = {
        uniqueCells: 5,
        dataBits: 2,
        references: 4, 
        success: true
    };
    await execute(root, BigInt(10), 'References to non-identical cells', expected, tonBocSizeAnalyzer, provider);

    bottom_cell_2 = beginCell().endCell();
    bottom_cell_1 = beginCell().storeUint(0,1).endCell();
    cell_2 = beginCell().storeRef(bottom_cell_2).storeRef(bottom_cell_1).endCell();
    cell_1 = beginCell().storeRef(bottom_cell_1).storeRef(bottom_cell_2).endCell();
    root = beginCell().storeRef(cell_1).storeRef(cell_2).endCell();  
    expected = {
        uniqueCells: 5,
        dataBits: 1,
        references: 6, 
        success: true
    };
    await execute(root, BigInt(10), 'Different references order', expected, tonBocSizeAnalyzer, provider);

    cell_2 = beginCell().storeUint(1,1).endCell();
    cell_1 = beginCell().storeUint(0,1).endCell();
    root = beginCell().storeRef(cell_1).storeRef(cell_2).endCell();  
    expected = {
        uniqueCells: null,
        dataBits: null,
        references: null,
        success: false
    };
    await execute(root, BigInt(2), 'Max cells limitation', expected, tonBocSizeAnalyzer, provider);

    cell_2 = beginCell().endCell();
    cell_1 = beginCell().endCell();
    root = beginCell().storeRef(cell_1).storeRef(cell_2).endCell();  
    expected = {
        uniqueCells: 2,
        dataBits: 0,
        references: 2,
        success: true
    };
    await execute(root, BigInt(2), 'Max cells limitation for actual / unique cells disbalance', expected, tonBocSizeAnalyzer, provider);

    console.log('done.');
}

async function execute(root: Cell, maxCells: bigint, desc: string, shouldBe: object, tonBocSizeAnalyzer: OpenedContract<TonBocSizeAnalyzer>, provider: NetworkProvider){
  
    await tonBocSizeAnalyzer.sendFillStorage(provider.sender(), toNano('0.01'), root);
    await provider.waitForLastTransaction();

    let resultForCell = await tonBocSizeAnalyzer.getResultsForCell(maxCells);
    let resultForSlice = await tonBocSizeAnalyzer.getResultsForCell(maxCells);

    console.log(desc);
    console.log('--------------------');

    console.log('resultForCell:');
    console.log(resultForCell);
    
    console.log('resultForSlice:');
    console.log(resultForSlice);

    console.log('should be:');
    console.log(shouldBe);

    console.log();
}