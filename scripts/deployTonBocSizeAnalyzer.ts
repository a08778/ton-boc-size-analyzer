import { toNano } from '@ton/core';
import { TonBocSizeAnalyzer } from '../wrappers/TonBocSizeAnalyzer';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const tonBocSizeAnalyzer = provider.open(TonBocSizeAnalyzer.createFromConfig({}, await compile('TonBocSizeAnalyzer')));

    await tonBocSizeAnalyzer.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(tonBocSizeAnalyzer.address);

    // run methods on `tonBocSizeAnalyzer`
}
