var sneakMode = __config__.getBool("sneak_mode");
var destroyParticles = __config__.getBool("destroy_particles");
var maxBreakCount = 512;
var IS_NEW_GAME_VERSION = getMCPEVersion().main - 17 > 11;
var ores = [14, 15, 16, 21, 73, 74, 56, 129, 153];
ModAPI.registerAPI("VeinMinerBlocks", ores);
Callback.addCallback("PreLoaded", function () {
    for (var id in BlockID) {
        var numericId = BlockID[id];
        if ((id.startsWith("ore") || id.endsWith("_ore")) && !TileEntity.isTileEntityBlock(numericId)) {
            ores.push(numericId);
        }
    }
});
Callback.addCallback("DestroyBlock", function (coords, block, player) {
    if (Entity.getSneaking(player) != sneakMode)
        return;
    var item = Entity.getCarriedItem(player);
    var toolLevel = ToolAPI.getToolLevelViaBlock(item.id, block.id);
    if (ores.indexOf(block.id) != -1 && toolLevel > 0) {
        var region = BlockSource.getDefaultForActor(player);
        var toolData = ToolAPI.getToolData(item.id);
        var enchants = ToolAPI.getEnchantExtraData(item.extra);
        if (toolData.modifyEnchant) {
            toolData.modifyEnchant(enchants, item);
        }
        var veinData = {
            player: player,
            region: region,
            startingBlock: block,
            breakCount: 0,
            item: item,
            toolId: item.id,
            toolData: toolData,
            enchants: enchants
        };
        if (IS_NEW_GAME_VERSION) {
            region.setDestroyParticlesEnabled(destroyParticles);
        }
        reqursiveDestroyFor6Sides(veinData, coords);
        Entity.setCarriedItem(player, item.id, item.count, item.data, item.extra);
    }
});
function reqursiveDestroyFor6Sides(veinData, startCoords) {
    for (var side = 0; side < 6; side++) {
        var relative = World.getRelativeCoords(startCoords.x, startCoords.y, startCoords.z, side);
        var coordsObj = {
            x: relative.x,
            y: relative.y,
            z: relative.z,
            side: side ^ 1,
            relative: startCoords
        };
        reqursiveDestroyOre(veinData, coordsObj);
    }
}
function reqursiveDestroyOre(veinData, coords) {
    var player = veinData.player, region = veinData.region, startingBlock = veinData.startingBlock, item = veinData.item, toolId = veinData.toolId, toolData = veinData.toolData, enchants = veinData.enchants;
    var block = region.getBlock(coords.x, coords.y, coords.z);
    if (veinData.breakCount < maxBreakCount && item.id == toolId &&
        item.data < toolData.toolMaterial.durability &&
        (startingBlock.id == block.id && startingBlock.data == block.data || startingBlock.id == 73 && block.id == 74 || startingBlock.id == 74 && block.id == 73)) {
        if (!(toolData.onDestroy && toolData.onDestroy(item, coords, block, player)) && Math.random() < 1 / (enchants.unbreaking + 1)) {
            item.data += toolData.isWeapon ? 2 : 1;
        }
        if (item.data >= toolData.toolMaterial.durability) {
            if (!(toolData.onBroke && toolData.onBroke(item))) {
                item.id = toolData.brokenId;
                item.count = 1;
                item.data = 0;
            }
        }
        veinData.breakCount++;
        destroyBlock(veinData, coords, block);
        reqursiveDestroyFor6Sides(veinData, coords);
    }
}
function destroyBlock(veinData, coords, block) {
    var region = veinData.region, item = veinData.item, enchants = veinData.enchants;
    if (IS_NEW_GAME_VERSION) {
        region.breakBlock(coords.x, coords.y, coords.z, true, -1, item);
    }
    else {
        var dropFunc = Block.dropFunctions[block.id];
        if (dropFunc) {
            var toolLevel = ToolAPI.getToolLevel(item.id);
            var drop = dropFunc(coords, block.id, block.data, toolLevel, enchants, item, region);
            for (var i in drop) {
                region.spawnDroppedItem(coords.x, coords.y, coords.z, drop[i][0], drop[i][1], drop[i][2], drop[i][3] || null);
            }
        }
        if (destroyParticles) {
            region.destroyBlock(coords.x, coords.y, coords.z, false);
        }
        else {
            region.setBlock(coords.x, coords.y, coords.z, 0, 0);
        }
    }
}
