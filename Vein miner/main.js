var ores = [14, 15, 16, 21, 73, 74, 56, 129, 153];
var sneakMode = false;
var destroyParticles = false;

Callback.addCallback("PreLoaded", function(){
	for(var id in BlockID){
		if(id[0]=='o' && id[1]=='r' && id[2]=='e' && !TileEntity.isTileEntityBlock(Block[id])){
			ores.push(BlockID[id]);
		}
	}
	ModAPI.registerAPI("VeinMinerBlocks", ores);
});

Callback.addCallback("LevelLoaded", function(){
	sneakMode = __config__.getBool("sneak_mode");
	destroyParticles = __config__.getBool("destroy_particles");
})

Callback.addCallback("DestroyBlock", function(coords, block, player){
	if(Entity.getSneaking(Player.get()) == sneakMode){
		var item = Player.getCarriedItem();
		var toolData = ToolAPI.getToolData(item.id);
		var toolLevel = ToolAPI.getToolLevelViaBlock(item.id, block.id);
		if(ores.indexOf(block.id) != -1 && toolLevel > 0){
			var enchant = ToolAPI.getEnchantExtraData(item.extra);
			if (toolData.modifyEnchant) {
	            toolData.modifyEnchant(enchant, item);
	        }
			reqursiveDestroyFor6Sides(coords.x, coords.y, coords.z, item, block, toolLevel, enchant);
			Player.setCarriedItem(item.id, item.count, item.data, item.extra);
		}
	}
});

function reqursiveDestroyOre(x, y, z, item, block, level, enchant){
	var blockID = World.getBlockID(x, y, z);
	var toolData = ToolAPI.getToolData(item.id);
	if (toolData && item.data < toolData.toolMaterial.durability && (block.id == blockID || block.id==73 && blockID==74 || block.id==74 && blockID==73)) {
		var coords = {x: x, y: y, z: z};
		if (!(toolData.onDestroy && toolData.onDestroy(item, coords, block)) && Math.random() < 1 / (enchant.unbreaking + 1)) {
			item.data++;
			if (toolData.isWeapon) {
				item.data++;
			}
        }
        if (item.data >= toolData.toolMaterial.durability) {
            if (!(toolData.onBroke && toolData.onBroke(item, coords, block))) {
                item.id = toolData.brokenId;
                item.count = 1;
                item.data = 0;
            }
        }

		if (destroyParticles) {
			World.destroyBlock(x, y, z, true);
		} else {
			var dropFunc = Block.dropFunctions[block.id];
			if (dropFunc) {
				var drop = dropFunc(coords, block.id, block.data, level, enchant);
				for (var i in drop) {
					World.drop(x, y, z, drop[i][0], drop[i][1], drop[i][2]);
				}
			}
			World.setBlock(x, y, z, 0);
		}
		reqursiveDestroyFor6Sides(x, y, z, item, block, level, enchant);
	}
}

function reqursiveDestroyFor6Sides(x, y, z, item, block, level, enchant){
	reqursiveDestroyOre(x+1, y, z, item, block, level, enchant);
	reqursiveDestroyOre(x-1, y, z, item, block, level, enchant);
	reqursiveDestroyOre(x, y+1, z, item, block, level, enchant);
	reqursiveDestroyOre(x, y-1, z, item, block, level, enchant);
	reqursiveDestroyOre(x, y, z+1, item, block, level, enchant);
	reqursiveDestroyOre(x, y, z-1, item, block, level, enchant);
}
