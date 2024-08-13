const sneakMode = __config__.getBool("sneak_mode");
const destroyParticles = __config__.getBool("destroy_particles");
const maxBreakCount = 512;
const IS_NEW_GAME_VERSION = getMCPEVersion().main - 17 > 11;

const ores = [14, 15, 16, 21, 73, 74, 56, 129, 153];
ModAPI.registerAPI("VeinMinerBlocks", ores);

Callback.addCallback("PreLoaded", function() {
	for (let id in BlockID) {
		const numericId = BlockID[id];
		if ((id.startsWith("ore") || id.endsWith("_ore")) && !TileEntity.isTileEntityBlock(numericId)) {
			ores.push(numericId);
		}
	}
});

type VeinBreakingData = {
	player: number;
	region: BlockSource;
	startingBlock: Tile;
	breakCount: number;
	item: ItemInstance;
	toolId: number;
	toolData: ToolAPI.ToolParams;
	enchants: ToolAPI.EnchantData;
}

Callback.addCallback("DestroyBlock", function(coords, block, player) {
	if (Entity.getSneaking(player) != sneakMode) return;

	const item = Entity.getCarriedItem(player);
	const toolLevel = ToolAPI.getToolLevelViaBlock(item.id, block.id);
	if (ores.indexOf(block.id) != -1 && toolLevel > 0) {
		const region = BlockSource.getDefaultForActor(player);
		const toolData = ToolAPI.getToolData(item.id);
		const enchants = ToolAPI.getEnchantExtraData(item.extra);
		if (toolData.modifyEnchant) {
			toolData.modifyEnchant(enchants, item);
		}
		const veinData: VeinBreakingData = {
			player: player,
			region: region,
			startingBlock: block,
			breakCount: 0,
			item: item,
			toolId: item.id,
			toolData: toolData,
			enchants: enchants
		}
		if (IS_NEW_GAME_VERSION) {
			region.setDestroyParticlesEnabled(destroyParticles);
		}
		reqursiveDestroyFor6Sides(veinData, coords);
		Entity.setCarriedItem(player, item.id, item.count, item.data, item.extra);
	}
});

function reqursiveDestroyFor6Sides(veinData: VeinBreakingData, startCoords: Vector) {
	for (let side = 0; side < 6; side++) {
		const relative = World.getRelativeCoords(startCoords.x, startCoords.y, startCoords.z, side);
		const coordsObj: Callback.ItemUseCoordinates = {
			x: relative.x,
			y: relative.y,
			z: relative.z,
			side: side ^ 1,
			relative: startCoords
		}
		reqursiveDestroyOre(veinData, coordsObj);
	}
}

function reqursiveDestroyOre(veinData: VeinBreakingData, coords: Callback.ItemUseCoordinates) {
	const { player, region, startingBlock, item, toolId, toolData, enchants } = veinData;
	const block = region.getBlock(coords.x, coords.y, coords.z);
	if (veinData.breakCount < maxBreakCount && item.id == toolId &&
		item.data < toolData.toolMaterial.durability &&
		(startingBlock.id == block.id && startingBlock.data == block.data || startingBlock.id == 73 && block.id == 74 || startingBlock.id == 74 && block.id == 73)
	) {
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

function destroyBlock(veinData: VeinBreakingData, coords: Callback.ItemUseCoordinates, block: Tile) {
	const { region, item, enchants } = veinData;
	if (IS_NEW_GAME_VERSION) {
		region.breakBlock(coords.x, coords.y, coords.z, true, -1, item);
	} else {
		const dropFunc = Block.dropFunctions[block.id];
		if (dropFunc) {
			const toolLevel = ToolAPI.getToolLevel(item.id);
			const drop = dropFunc(coords, block.id, block.data, toolLevel, enchants, item, region);
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