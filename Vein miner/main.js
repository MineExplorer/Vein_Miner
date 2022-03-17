let sneakMode = __config__.getBool("sneak_mode");
let destroyParticles = __config__.getBool("destroy_particles");

const ores = [14, 15, 16, 21, 73, 74, 56, 129, 153];
ModAPI.registerAPI("VeinMinerBlocks", ores);

Callback.addCallback("PreLoaded", function() {
	for (let id in BlockID) {
		if (id.startsWith("ore") && !TileEntity.isTileEntityBlock(Block[id])) {
			ores.push(BlockID[id]);
		}
	}
});

Callback.addCallback("DestroyBlock", function(coords, block, player) {
	if (Entity.getSneaking(player) != sneakMode) return;

	const item = Entity.getCarriedItem(player);
	const toolLevel = ToolAPI.getToolLevelViaBlock(item.id, block.id);
	if (ores.indexOf(block.id) != -1 && toolLevel > 0) {
		const region = BlockSource.getDefaultForActor(player);
		const toolData = ToolAPI.getToolData(item.id);
		const enchant = ToolAPI.getEnchantExtraData(item.extra);
		if (toolData.modifyEnchant) {
			toolData.modifyEnchant(enchant, item);
		}
		reqursiveDestroyFor6Sides(region, coords.x, coords.y, coords.z, player, item, block, enchant);
		Entity.setCarriedItem(player, item.id, item.count, item.data, item.extra);
	}
});

function reqursiveDestroyFor6Sides(region, x, y, z, player, item, block, enchant) {
	reqursiveDestroyOre(region, x+1, y, z, player, item, block, enchant);
	reqursiveDestroyOre(region, x-1, y, z, player, item, block, enchant);
	reqursiveDestroyOre(region, x, y+1, z, player, item, block, enchant);
	reqursiveDestroyOre(region, x, y-1, z, player, item, block, enchant);
	reqursiveDestroyOre(region, x, y, z+1, player, item, block, enchant);
	reqursiveDestroyOre(region, x, y, z-1, player, item, block, enchant);
}

function reqursiveDestroyOre(region, x, y, z, player, item, block, enchant) {
	const blockID = region.getBlockId(x, y, z);
	const toolData = ToolAPI.getToolData(item.id);
	if (toolData && item.data < toolData.toolMaterial.durability && (block.id == blockID || block.id == 73 && blockID == 74 || block.id == 74 && blockID == 73)) {
		const coords = {x: x, y: y, z: z};
		if (!(toolData.onDestroy && toolData.onDestroy(item, coords, block, player)) && Math.random() < 1 / (enchant.unbreaking + 1)) {
			item.data += toolData.isWeapon ? 2 : 1;
        }
        if (item.data >= toolData.toolMaterial.durability) {
            if (!(toolData.onBroke && toolData.onBroke(item))) {
                item.id = toolData.brokenId;
                item.count = 1;
                item.data = 0;
            }
        }

		destroyBlock(region, coords, player, item, block, enchant);
		reqursiveDestroyFor6Sides(region, x, y, z, player, item, block, enchant);
	}
}

function destroyBlock(region, coords, player, item, block, enchant) {
	if (getMCPEVersion().main - 17 > 11) {
		if (destroyParticles) {
			region.breakBlock(coords.x, coords.y, coords.z, true, player, item);
		} else {
			Block.onBlockDestroyed(coords, block, false, true, region, player, item);
			region.setBlock(coords.x, coords.y, coords.z, 0, 0);
		}
	} else {
		const dropFunc = Block.dropFunctions[block.id];
		if (dropFunc) {
			const toolLevel = ToolAPI.getToolLevel(item.id);
			const drop = dropFunc(coords, block.id, block.data, toolLevel, enchant);
			for (let i in drop) {
				region.spawnDroppedItem(coords.x, coords.y, coords.z, drop[i][0], drop[i][1], drop[i][2], drop[i][3] || null);
			}
		}
		if (destroyParticles) {
			region.destroyBlock(coords.x, coords.y, coords.z, false);
		} else {
			region.setBlock(coords.x, coords.y, coords.z, 0, 0);
		}
	}
}