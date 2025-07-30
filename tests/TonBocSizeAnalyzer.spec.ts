import { Blockchain, SandboxContract, printTransactionFees, TreasuryContract } from '@ton/sandbox';
import { Cell, beginCell, toNano } from '@ton/core';
import { TonBocSizeAnalyzer } from '../wrappers/TonBocSizeAnalyzer';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('TonBocSizeAnalyzer', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('TonBocSizeAnalyzer');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let launcher: SandboxContract<TreasuryContract>;
    let tonBocSizeAnalyzer: SandboxContract<TonBocSizeAnalyzer>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.verbosity = {
            ...blockchain.verbosity,
            blockchainLogs: true,
            vmLogs: 'vm_logs',
            debugLogs: true,
            print: true,
        };

        tonBocSizeAnalyzer = blockchain.openContract(
            TonBocSizeAnalyzer.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');
        launcher = await blockchain.treasury('launcher');

        const deployResult = await tonBocSizeAnalyzer.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: tonBocSizeAnalyzer.address,
            deploy: true,
            success: true,
        });
    });

    it('An empty cell', async () => {                             
        
        // arrange
        const maxCells = BigInt(10);

        const root = beginCell().endCell();
        
        // act
        await tonBocSizeAnalyzer.sendFillStorage(launcher.getSender(), toNano('0.01'), root);

        // assert
        const resultForCell = await tonBocSizeAnalyzer.getResultsForCell(maxCells);
        const resultForSlice = await tonBocSizeAnalyzer.getResultsForCell(maxCells);

        const expected = {
            uniqueCells: 1,
            dataBits: 0,
            references: 0,
            success: true
         };

        expect(resultForCell).toEqual(expected);    
        expect(resultForSlice).toEqual(expected);     
    });

    it('Not empty celll', async () => {    

        // arrange
        const maxCells = BigInt(10);

        const root = beginCell().storeStringTail("value 1") // 7 symbols * 8 bit per symbol = 56 bits in total
            .endCell();  
        
        // act
        await tonBocSizeAnalyzer.sendFillStorage(launcher.getSender(), toNano('0.01'), root);

        // assert
        const resultForCell = await tonBocSizeAnalyzer.getResultsForCell(maxCells);
        const resultForSlice = await tonBocSizeAnalyzer.getResultsForCell(maxCells);

        const expected = {
            uniqueCells: 1,
            dataBits: 56,
            references: 0,
            success: true
         };
         
        expect(resultForCell).toEqual(expected);    
        expect(resultForSlice).toEqual(expected);   
    });

    it('One reference', async () => {    

        // arrange
        const maxCells = BigInt(10);

        const cell_1 = beginCell().endCell();
        const root = beginCell().storeRef(cell_1).endCell();  
        
        // act
        await tonBocSizeAnalyzer.sendFillStorage(launcher.getSender(), toNano('0.01'), root);

        // assert
        const resultForCell = await tonBocSizeAnalyzer.getResultsForCell(maxCells);
        const resultForSlice = await tonBocSizeAnalyzer.getResultsForCell(maxCells);

        const expected = {
            uniqueCells: 2,
            dataBits: 0,
            references: 1,
            success: true
         };
         
        expect(resultForCell).toEqual(expected);    
        expect(resultForSlice).toEqual(expected);   
    });

   it('No references / no value', async () => {    

        // arrange
        const maxCells = BigInt(10);

        const cell_2 = beginCell().endCell();
        const cell_1 = beginCell().endCell();
        const root = beginCell().storeRef(cell_1).storeRef(cell_2).endCell();  
        
        // act
        await tonBocSizeAnalyzer.sendFillStorage(launcher.getSender(), toNano('0.01'), root);

        // assert
        const resultForCell = await tonBocSizeAnalyzer.getResultsForCell(maxCells);
        const resultForSlice = await tonBocSizeAnalyzer.getResultsForCell(maxCells);

        const expected = {
            uniqueCells: 2,
            dataBits: 0,
            references: 2,
            success: true
         };
         
        expect(resultForCell).toEqual(expected);    
        expect(resultForSlice).toEqual(expected);   
    });

    it('No references / the same value', async () => {    

        // arrange
        const maxCells = BigInt(10);

        const cell_2 = beginCell().storeUint(0,1).endCell();
        const cell_1 = beginCell().storeUint(0,1).endCell();
        const root = beginCell().storeRef(cell_1).storeRef(cell_2).endCell();  
        
        // act
        await tonBocSizeAnalyzer.sendFillStorage(launcher.getSender(), toNano('0.01'), root);

        // assert
        const resultForCell = await tonBocSizeAnalyzer.getResultsForCell(maxCells);
        const resultForSlice = await tonBocSizeAnalyzer.getResultsForCell(maxCells);

        const expected = {
            uniqueCells: 2,
            dataBits: 1,
            references: 2,
            success: true
         };
         
        expect(resultForCell).toEqual(expected);    
        expect(resultForSlice).toEqual(expected);   
    });

   it('No references / different values', async () => {    

        // arrange
        const maxCells = BigInt(10);

        const cell_2 = beginCell().storeUint(1,1).endCell();
        const cell_1 = beginCell().storeUint(0,1).endCell();
        const root = beginCell().storeRef(cell_1).storeRef(cell_2).endCell();  
        
        // act
        await tonBocSizeAnalyzer.sendFillStorage(launcher.getSender(), toNano('0.01'), root);

        // assert
        const resultForCell = await tonBocSizeAnalyzer.getResultsForCell(maxCells);
        const resultForSlice = await tonBocSizeAnalyzer.getResultsForCell(maxCells);

        const expected = {
            uniqueCells: 3,
            dataBits: 2,
            references: 2,
            success: true
         };
         
        expect(resultForCell).toEqual(expected);    
        expect(resultForSlice).toEqual(expected);   
    });

    it('References to the same cel', async () => {    

        // arrange
        const maxCells = BigInt(10);

        const the_same_cell = beginCell().endCell();
        const cell_2 = beginCell().storeRef(the_same_cell).endCell();
        const cell_1 = beginCell().storeRef(the_same_cell).endCell();
        const root = beginCell().storeRef(cell_1).storeRef(cell_2).endCell();  
        
        // act
        await tonBocSizeAnalyzer.sendFillStorage(launcher.getSender(), toNano('0.01'), root);

        // assert
        const resultForCell = await tonBocSizeAnalyzer.getResultsForCell(maxCells);
        const resultForSlice = await tonBocSizeAnalyzer.getResultsForCell(maxCells);

        const expected = {
            uniqueCells: 3,
            dataBits: 0,
            references: 3, 
            success: true
         };
         
        expect(resultForCell).toEqual(expected);    
        expect(resultForSlice).toEqual(expected);   
    });

    it('References to identical cells', async () => {    

        // arrange
        const maxCells = BigInt(10);

        const cell_2_1 = beginCell().endCell();
        const cell_1_1 = beginCell().endCell();
        const cell_2 = beginCell().storeRef(cell_2_1).endCell();
        const cell_1 = beginCell().storeRef(cell_1_1).endCell();
        const root = beginCell().storeRef(cell_1).storeRef(cell_2).endCell();  
        
        // act
        await tonBocSizeAnalyzer.sendFillStorage(launcher.getSender(), toNano('0.01'), root);

        // assert
        const resultForCell = await tonBocSizeAnalyzer.getResultsForCell(maxCells);
        const resultForSlice = await tonBocSizeAnalyzer.getResultsForCell(maxCells);

        const expected = {
            uniqueCells: 3,
            dataBits: 0,
            references: 3,
            success: true
         };
         
        expect(resultForCell).toEqual(expected);    
        expect(resultForSlice).toEqual(expected);   
    });
  
    it('References to non-identical cells', async () => {    

        // arrange
        const maxCells = BigInt(10);

        const cell_2_1 = beginCell().storeUint(1, 1).endCell();
        const cell_1_1 = beginCell().storeUint(0, 1).endCell();
        const cell_2 = beginCell().storeRef(cell_2_1).endCell();
        const cell_1 = beginCell().storeRef(cell_1_1).endCell();
        const root = beginCell().storeRef(cell_1).storeRef(cell_2).endCell();  
        
        // act
        await tonBocSizeAnalyzer.sendFillStorage(launcher.getSender(), toNano('0.01'), root);

        // assert
        const resultForCell = await tonBocSizeAnalyzer.getResultsForCell(maxCells);
        const resultForSlice = await tonBocSizeAnalyzer.getResultsForCell(maxCells);

        const expected = {
            uniqueCells: 5,
            dataBits: 2,
            references: 4, 
            success: true
        };
         
        expect(resultForCell).toEqual(expected);    
        expect(resultForSlice).toEqual(expected);   
    });

    it('Different references order', async () => {    

        // arrange
        const maxCells = BigInt(10);

        const bottom_cell_2 = beginCell().endCell();
        const bottom_cell_1 = beginCell().storeUint(0,1).endCell();
        const cell_2 = beginCell().storeRef(bottom_cell_2).storeRef(bottom_cell_1).endCell();
        const cell_1 = beginCell().storeRef(bottom_cell_1).storeRef(bottom_cell_2).endCell();
        const root = beginCell().storeRef(cell_1).storeRef(cell_2).endCell();  
        
        // act
        await tonBocSizeAnalyzer.sendFillStorage(launcher.getSender(), toNano('0.01'), root);

        // assert
        const resultForCell = await tonBocSizeAnalyzer.getResultsForCell(maxCells);
        const resultForSlice = await tonBocSizeAnalyzer.getResultsForCell(maxCells);

        const expected = {
            uniqueCells: 5,
            dataBits: 1,
            references: 6, 
            success: true
         };
         
        expect(resultForCell).toEqual(expected);    
        expect(resultForSlice).toEqual(expected);   
    });

    it('Max cells limitation', async () => {    

        // arrange
        const maxCells = BigInt(2);

        const cell_2 = beginCell().storeUint(1,1).endCell();
        const cell_1 = beginCell().storeUint(0,1).endCell();
        const root = beginCell().storeRef(cell_1).storeRef(cell_2).endCell();  
        
        // act
        await tonBocSizeAnalyzer.sendFillStorage(launcher.getSender(), toNano('0.01'), root);

        // assert
        const resultForCell = await tonBocSizeAnalyzer.getResultsForCell(maxCells);
        const resultForSlice = await tonBocSizeAnalyzer.getResultsForCell(maxCells);

        const expected = {
            uniqueCells: null,
            dataBits: null,
            references: null,
            success: false
         };
         
        expect(resultForCell).toEqual(expected);    
        expect(resultForSlice).toEqual(expected);   
    });

     it('Max cells limitation for actual / unique cells disbalance', async () => {    

        // arrange
        const maxCells = BigInt(2);

        const cell_2 = beginCell().endCell();
        const cell_1 = beginCell().endCell();
        const root = beginCell().storeRef(cell_1).storeRef(cell_2).endCell();  
        
        // act
        await tonBocSizeAnalyzer.sendFillStorage(launcher.getSender(), toNano('0.01'), root);

        // assert
        const resultForCell = await tonBocSizeAnalyzer.getResultsForCell(maxCells);
        const resultForSlice = await tonBocSizeAnalyzer.getResultsForCell(maxCells);

        const expected = {
            uniqueCells: 2,
            dataBits: 0,
            references: 2,
            success: true
         };
         
        expect(resultForCell).toEqual(expected);    
        expect(resultForSlice).toEqual(expected);   
    });
});
