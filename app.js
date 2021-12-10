const { Hive } = require('@splinterlands/hive-interface');
const colors = require('colors');
const config = require('./config.json');
const { MongoClient } = require('mongodb');
const { HiveEngine } = require('@splinterlands/hive-interface');
let hive_engine = new HiveEngine();
const schedule = require('node-schedule');
const { upperCase } = require('upper-case');
const dotENV = require('dotenv/config');

const sscjs = require('sscjs');
var sscString = config.ssc_api;
var ssc = new sscjs(sscString);

const hive = new Hive({
  logging_level: 0,
  rpc_nodes: config.rpc_nodes
});

var TIMEOUT = config.timeout;
TIMEOUT = parseInt(TIMEOUT) || 0;
var RECTIMEOUT = config.rec_timeout;
RECTIMEOUT = parseInt(RECTIMEOUT) || 0;
var HETIMEOUT = config.he_timeout;
HETIMEOUT = parseInt(HETIMEOUT) || 0;
var BLOCKTIMEOUT = config.block_timeout;
BLOCKTIMEOUT = parseInt(BLOCKTIMEOUT) || 0;

var DB_STRING = process.env.DB_STRING || config.db_string;
var DB_NAME = config.db_name;
var DB_TABLE_POOL_NAME = config.db_table_pool_name;
var DB_DIVIDEND_TABLE_NAME = config.db_table_dividend_name;
var DB_TABLE_MINT_NAME = config.db_table_mint_name;

var JSONID = config.json_id;

var MINTCONTRACT = config.reward_pools_setting.mint_setting.contract;
var MINTACTION = config.reward_pools_setting.mint_setting.action;
var MINTEVENT = config.reward_pools_setting.mint_setting.event;
var REWARDERNAME = config.reward_pools_setting.reward_setting.distributor_account;
var REWARDERKEY = process.env.REWARDERKEY || config.reward_pools_setting.reward_setting.distributor_activekey;

var REWARDCONTRACT = config.reward_pools_setting.reward_setting.contract;
var REWARDACTION = config.reward_pools_setting.reward_setting.action;
var REWARDEVENT = config.reward_pools_setting.reward_setting.event;

var BALANCECONTRACT = config.reward_pools_setting.balance_setting.contract;
var BALANCETABLE = config.reward_pools_setting.balance_setting.table;

var POOLCONTRACT = config.reward_pools_setting.pool_setting.contract;
var POOLTABLE = config.reward_pools_setting.pool_setting.table;

var USERLIMIT = config.contract_setting.limit;
USERLIMIT = parseInt(USERLIMIT) || 0;
var DECIMAL = config.decimal;
DECIMAL = parseInt(DECIMAL) || 0;

var SUCCESSREMOVEDAYS = config.db_remove_days;
SUCCESSREMOVEDAYS = parseInt(SUCCESSREMOVEDAYS) || 0;

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

const processDividends = async() => {
    try
    {
        poolProcess();
    }
    catch(error)
    {
        console.log("Error at processDividends() : ", error);
    }
};

const poolProcess = async() => {
    var poolStatus = false;
    try
    {
        var poolList = config.reward_pools_setting.pools;
        if(poolList.length > 0)
        {
            async function recursive(n)
			{
                if (n <= poolList.length - 1) 
				{
                    var poolName = upperCase(poolList[n][0]);
                    var poolUserCount = poolList[n][1];
					poolUserCount = parseInt(poolUserCount) || 0;
                    var poolMaxDays = poolList[n][2];
                    poolMaxDays = parseInt(poolMaxDays) || 0;
                    var poolStatus = poolList[n][3]; 
                    var poolTokenArray = poolList[n][4];
                    var excludeUsers = poolList[n][5];

                    console.log("*****************************************************".yellow);    
                    console.log("POOL NAME : ", poolName);
                    console.log("USER COUNT : ", poolUserCount);
                    console.log("MAX DAYS : ", poolMaxDays);
                    console.log("*****************************************************".yellow);                 

                    if(poolStatus == true)
                    {
                        var poolUsers = await getUserBalances(poolName, poolUserCount, excludeUsers);                                                             
                        if(poolUsers.length > 0)
                        {
                            var poolData = await getPoolData(poolName);                      

                            var poolDayCount = 0;
                            var poolLastTimeStamp = await getDateTimeStamp();       

                            if(poolData != null)
                            {                                                                
                                poolDayCount = poolData.poolDayCount;
                                poolLastTimeStamp = poolData.poolLastTimeStamp;

                                var dateTimeStamp = await getDateTimeStamp(); 

                                if(poolDayCount < poolMaxDays)
                                {                                    
                                    if(poolTokenArray.length > 0)
                                    {
                                        var rewardTokenStatus = await rewardTokenProcess(poolName, poolUsers, poolTokenArray);
                                        if(rewardTokenStatus == true)
                                        {
                                            if(poolLastTimeStamp == dateTimeStamp)
                                            {
                                                console.log(poolName, "DATA ALREADY UPDATED FOR TODAY".yellow);
                                                await timeout(RECTIMEOUT);
                                                await recursive(n + 1);
                                            }
                                            else
                                            {
                                                var poolNewCount = poolDayCount + 1;
                                                var poolDataStatus = await updatePoolData(poolName, poolNewCount);
                                                if(poolDataStatus == true)
                                                {
                                                    console.log(poolName, "DATA UPDATED SUCCESSFULLY".green);
                                                    await timeout(RECTIMEOUT);
                                                    await recursive(n + 1);
                                                }
                                                else
                                                {
                                                    console.log(poolName, "DATA UPDATED FAILED".red);
                                                    await timeout(RECTIMEOUT);
                                                    await recursive(n + 1);
                                                }                                                
                                            }                                            
                                        }
                                        else
                                        {
                                            console.log(poolName, "TOKEN REWARD PROCESS FAILED".red);
                                            await timeout(RECTIMEOUT);
                                            await recursive(n + 1);
                                        }        
                                    }
                                    else
                                    {
                                        console.log(poolName, "HAS NO TOKENS TO SHARE REWARDS".red);
                                        await timeout(RECTIMEOUT);
                                        await recursive(n + 1);    
                                    }
                                }
                                else
                                {
                                    console.log(poolName, "POOL REWARD COUNT FILLED".red);
                                    await timeout(RECTIMEOUT);
                                    await recursive(n + 1);
                                }
                            }
                            else
                            {
                                if(poolDayCount <= poolMaxDays)
                                {                                    
                                    if(poolTokenArray.length > 0)
                                    {
                                        var rewardTokenStatus = await rewardTokenProcess(poolName, poolUsers, poolTokenArray);
                                        if(rewardTokenStatus == true)
                                        {
                                            var poolNewCount = poolDayCount + 1;
                                            var poolDataStatus = await insertOnePoolDb(poolName, poolNewCount);
                                            if(poolDataStatus == true)
                                            {
                                                console.log(poolName, "DATA INSERTED SUCCESSFULLY".green);
                                                await timeout(RECTIMEOUT);
                                                await recursive(n + 1);
                                            }
                                            else
                                            {
                                                console.log(poolName, "DATA INSERTED FAILED".red);
                                                await timeout(RECTIMEOUT);
                                                await recursive(n + 1);
                                            }                                        
                                        }
                                        else
                                        {
                                            console.log(poolName, "TOKEN REWARD PROCESS FAILED".red);
                                            await timeout(RECTIMEOUT);
                                            await recursive(n + 1);
                                        }        
                                    }
                                    else
                                    {
                                        console.log(poolName, "HAS NO TOKENS TO SHARE REWARDS".red);
                                        await timeout(RECTIMEOUT);
                                        await recursive(n + 1);    
                                    }
                                }
                                else
                                {
                                    console.log(poolName, "POOL REWARD COUNT FILLED".red);
                                    await timeout(RECTIMEOUT);
                                    await recursive(n + 1);
                                }
                            }
                        }
                        else
                        {
                            console.log(poolName, "HAS NO USERS TO SHARE REWARDS".red);
                            await timeout(RECTIMEOUT);
                            await recursive(n + 1);
                        }
                    }
                    else
                    {
                        console.log(poolName, "IS NOT AVAILABLE".red);
                        await timeout(RECTIMEOUT);
                        await recursive(n + 1);
                    }
                }
                else
				{
					console.log("ALL POOLS PROCESSED".blue);
					poolStatus = true;
				}
            }
            await recursive(0);
        }
        return poolStatus;
    }
    catch(error)
    {
        console.log("Error at poolProcess() : ", error);
        return poolStatus;
    }
};

const getUserBalances = async(poolName, poolUserCount, excludeUsers) => {
	var userArray = [];
	try
	{
		var poolData = await processPoolBalance(poolName, excludeUsers);		
        var totalShares = 0.0;		
		if(poolData.length > 0)
		{			
			const topShares = poolData.slice(0, poolUserCount);
			for(i = 0; i < topShares.length; i += 1)
			{
				totalShares += parseFloat(topShares[i].shares) || 0.0;				
			}
			
			totalShares = Math.floor(totalShares * DECIMAL) / DECIMAL;
			
			for(i = 0; i < topShares.length; i += 1)
			{				 
				var share = Math.floor((parseFloat(topShares[i].shares) / totalShares) * DECIMAL) / DECIMAL;
				var ddata = {
					"rank" : i + 1,
					"account" : topShares[i].account,
					"stake" : parseFloat(topShares[i].shares) || 0.0,
					"share" : share,
					"total" : totalShares
				}
				userArray.push(ddata);
			}
			return userArray;	
		}
		else
		{
			console.log("NO SHARE HOLDER DETAILS HERE".red);
			return userArray;	
		}
	}
	catch(error)
	{
		console.log("Error at getUserBalances() : ", error);
		return userArray;
	}
};

const processPoolBalance = async(poolName, excludeUsers) => {
	try
	{
		var balancesDetails = [];
		async function getBalances(n)
		{
			try
			{
				let result = await ssc.find(POOLCONTRACT, POOLTABLE, { tokenPair: poolName }, USERLIMIT, n, []);
				if(result.length > 0)
				{
					console.log('RETRIEVING BALANCES...'.green);
					result.forEach(function(balance) 
					{                        
                        if(!excludeUsers.includes(balance.account))
                        {
						    balancesDetails.push(balance);
                        }
					});
					console.log('OFFSET VALUE : '.yellow, balancesDetails.length);			
					await getBalances(n + 1000);
				}
				else
				{
					console.log('');
					console.log('STARTED SHARE BALANCES SORTING...'.green);
					balancesDetails.sort(function(a, b) 
					{
                        			
						return parseFloat(b.shares) - parseFloat(a.shares);				
					});	
					
					console.log('SHARE BALANCES HAVE BEEN SORTED'.blue);
					console.log('TOTAL SHARE HOLDERS : '.yellow, balancesDetails.length);
				}
			}
			catch(error)
			{
				console.log("Error at getBalances() : ", error);				
			}			
		}
		await getBalances(0);
		return balancesDetails;	
	}
	catch(error)
	{
		console.log("Error at processTokenBalance() : ", error);
		return balancesDetails;	
	}
};

const getPoolData = async(poolName) => {
    var findPoolData = null;
	try
	{
		const client = await MongoClient.connect(DB_STRING, { useUnifiedTopology: true });
		const database = client.db(DB_NAME);
		const table = database.collection(DB_TABLE_POOL_NAME);
        		
		var findQuery = {
			poolName : poolName
		}
				
		const result = await table.findOne(findQuery);        
		client.close();
		findPoolData = result;               
		return findPoolData;
	}
	catch(error)
	{
		console.log("Error at countPoolDays() : ", error);
		return findPoolData;
	}
};

const rewardTokenProcess = async(poolName, poolUsers, poolTokenArray) => {
    var rewardStatus = false;
    try
    {
        if(poolTokenArray.length > 0)
        {
            async function recursive(n)
			{
                if (n <= poolTokenArray.length - 1) 
				{
                    var tokenName = upperCase(poolTokenArray[n][0]);
                    var availabilityStatus = poolTokenArray[n][1];
                    var tokenQty = poolTokenArray[n][2];
                    tokenQty = parseFloat(tokenQty) || 0.0;
                    var mintStatus = poolTokenArray[n][3];                    
                    var mintAccount = poolTokenArray[n][4];
                    var mintKey = poolTokenArray[n][5];

                    if(availabilityStatus == true)
                    {
                        if(mintStatus == true)
                        {
                            if(tokenQty > 0.0)
                            {
                                var mintStatusData = await findMintDataDb(poolName, tokenName);
                                if(mintStatusData == true)
                                {
                                    console.log(tokenName, "TOKEN ALREADY MINTED".blue);
                                    var processStatus = await findProcessDataDb(poolName, tokenName);
                                    if(processStatus == true)
									{
										console.log(tokenName.yellow, "POOL REWARDS ALREADY PROCESSED".green);
										await timeout(RECTIMEOUT);
										await recursive(n + 1);
									}
                                    else
                                    {
                                        var rewarderData = await calcRewards(poolUsers, tokenQty);
                                        if(rewarderData.length > 0)
										{
                                            var checkBalanceStatus = await checkTokenBalance(tokenName, tokenQty);
                                            if(checkBalanceStatus == true)
											{
                                                var transferStatus = await transPoolShare(rewarderData, tokenName, poolName);
                                                if(transferStatus == true)
												{
                                                    console.log(poolName, " - ".green, tokenName, "POOL REWARDS SUCCESSFULLY TRANSFERRED".yellow);
                                                    var insertDividendData = await insertDividendTransDb(tokenName, poolName, tokenQty);
                                                    if(insertDividendData == true)
                                                    {
                                                        console.log(poolName, " - ".green, tokenName, "POOL REWARD SUCCESSFULLY ADDED".yellow);
                                                        await timeout(RECTIMEOUT);
                                                        await recursive(n + 1);
                                                    }
                                                    else
                                                    {
                                                        console.log(poolName, " - ".yellow, tokenName, "POOL REWARD FAILED TO ADD TO DB".red);
                                                        await timeout(RECTIMEOUT);
                                                        await recursive(n + 1);
                                                    }
                                                }
                                                else
                                                {
                                                    console.log(poolName, " - ".yellow, tokenName, "POOL REWARD TRANSFER FAILED".red);
                                                    await timeout(RECTIMEOUT);
                                                    await recursive(n + 1);
                                                }
                                            }
                                            else
                                            {
                                                console.log(tokenName, "BALANCE IS NOT ENOUGH TO SEND REWARDS".red);
												await timeout(RECTIMEOUT);
												await recursive(n + 1);
                                            }
                                        }
                                        else
                                        {
                                            console.log(tokenName, "REWARDER CALCULATION FAILED".red);
											await timeout(RECTIMEOUT);
											await recursive(n + 1);
                                        }
                                    }                                    
                                }
                                else
                                {
                                    if(mintAccount != "" && mintKey != "")
                                    {
                                        var mintNewStatusData = await mintPoolToken(tokenName, poolName, tokenQty, mintAccount, mintKey);
                                        if(mintNewStatusData.length > 0)
                                        {
                                            var mintNewStatus = mintNewStatusData[0].mint_status;
                                            var mintTransactionId = mintNewStatusData[0].mint_id;
                                            if(mintNewStatus == true)
                                            {
                                                var insertMintData = await insertOneMintDb(mintTransactionId, mintNewStatus, tokenName, tokenQty, poolName);
                                                if(insertMintData == true)
                                                {
                                                    console.log(tokenName, "MINT TRANSACTION SUCCESSFULLY ADDED".yellow);
                                                    var processStatus = await findProcessDataDb(poolName, tokenName);
                                                    if(processStatus == true)
                                                    {
                                                        console.log(tokenName.yellow, "POOL REWARDS ALREADY PROCESSED".green);
                                                        await timeout(RECTIMEOUT);
                                                        await recursive(n + 1);
                                                    }
                                                    else
                                                    { 
                                                        var rewarderData = await calcRewards(poolUsers, tokenQty);
                                                        if(rewarderData.length > 0)
                                                        {
                                                            var checkBalanceStatus = await checkTokenBalance(tokenName, tokenQty);
                                                            if(checkBalanceStatus == true)
                                                            {
                                                                var transferStatus = await transPoolShare(rewarderData, tokenName, poolName);
                                                                if(transferStatus == true)
                                                                {
                                                                    console.log(poolName, " - ".green, tokenName, "POOL REWARDS SUCCESSFULLY TRANSFERRED".yellow);
                                                                    var insertDividendData = await insertDividendTransDb(tokenName, poolName, tokenQty);
                                                                    if(insertDividendData == true)
                                                                    {
                                                                        console.log(poolName, " - ".green, tokenName, "POOL REWARD SUCCESSFULLY ADDED".yellow);
                                                                        await timeout(RECTIMEOUT);
                                                                        await recursive(n + 1);
                                                                    }
                                                                    else
                                                                    {
                                                                        console.log(poolName, " - ".yellow, tokenName, "POOL REWARD FAILED TO ADD TO DB".red);
                                                                        await timeout(RECTIMEOUT);
                                                                        await recursive(n + 1);
                                                                    }
                                                                }
                                                                else
                                                                {
                                                                    console.log(poolName, " - ".yellow, tokenName, "POOL REWARD TRANSFER FAILED".red);
                                                                    await timeout(RECTIMEOUT);
                                                                    await recursive(n + 1);
                                                                }
                                                            }
                                                            else
                                                            {
                                                                console.log(tokenName, "BALANCE IS NOT ENOUGH TO SEND REWARDS".red);
                                                                await timeout(RECTIMEOUT);
                                                                await recursive(n + 1);
                                                            }
                                                        }
                                                        else
                                                        {
                                                            console.log(tokenName, "REWARDER CALCULATION FAILED".red);
                                                            await timeout(RECTIMEOUT);
                                                            await recursive(n + 1);
                                                        }
                                                    }   
                                                } 
                                                else
                                                {
                                                    console.log(tokenName, "MINT TRANSACTION FAILED TO ADD TO DB".red);
                                                    await timeout(RECTIMEOUT);
                                                    await recursive(n + 1);
                                                }
                                            }
                                            else
                                            {
                                                console.log(tokenName, "MINT PROCESS FAILED".red);
                                                await timeout(RECTIMEOUT);
                                                await recursive(n + 1);
                                            }
                                        }
                                        else
                                        {
                                            console.log(tokenName, "MINT PROCESS LENGTH IS 0 (FAILED)".red);
                                            await timeout(RECTIMEOUT);
                                            await recursive(n + 1);
                                        }                                
                                    }
                                    else
                                    {
                                        console.log(tokenName, "USER & KEYS FAILED".red);
                                        await timeout(RECTIMEOUT);
                                        await recursive(n + 1);
                                    }
                                }                        
                            }
                            else
                            {
                                console.log(tokenName, "DEFINED QTY IS INCORRECT".red);
                                await timeout(RECTIMEOUT);
                                await recursive(n + 1);
                            }
                        }
                        else
                        {
                            var processStatus = await findProcessDataDb(poolName, tokenName);
                            if(processStatus == true)
							{
								console.log(tokenName.yellow, "POOL REWARDS ALREADY PROCESSED".green);
								await timeout(RECTIMEOUT);
								await recursive(n + 1);
							}
                            else
                            {
                                var rewarderData = await calcRewards(poolUsers, tokenQty);
                                if(rewarderData.length > 0)
                                {
                                    var checkBalanceStatus = await checkTokenBalance(tokenName, tokenQty);
                                    if(checkBalanceStatus == true)
                                    {
                                        var transferStatus = await transPoolShare(rewarderData, tokenName, poolName);
                                        if(transferStatus == true)
                                        {
                                            console.log(poolName, " - ".green, tokenName, "POOL REWARDS SUCCESSFULLY TRANSFERRED".yellow);
                                            var insertDividendData = await insertDividendTransDb(tokenName, poolName, tokenQty);
                                            if(insertDividendData == true)
                                            {
                                                console.log(poolName, " - ".green, tokenName, "POOL REWARD SUCCESSFULLY ADDED".yellow);
                                                await timeout(RECTIMEOUT);
                                                await recursive(n + 1);
                                            }
                                            else
                                            {
                                                console.log(poolName, " - ".yellow, tokenName, "POOL REWARD FAILED TO ADD TO DB".red);
                                                await timeout(RECTIMEOUT);
                                                await recursive(n + 1);
                                            }
                                        }
                                        else
                                        {
                                            console.log(poolName, " - ".yellow, tokenName, "POOL REWARD TRANSFER FAILED".red);
                                            await timeout(RECTIMEOUT);
                                            await recursive(n + 1);
                                        }
                                    }
                                    else
                                    {
                                        console.log(tokenName, "BALANCE IS NOT ENOUGH TO SEND REWARDS".red);
                                        await timeout(RECTIMEOUT);
                                        await recursive(n + 1);
                                    }
                                }
                                else
                                {
                                    console.log(tokenName, "REWARDER CALCULATION FAILED".red);
                                    await timeout(RECTIMEOUT);
                                    await recursive(n + 1);
                                }
                            }
                        }
                    }
                    else
                    {
                        console.log(tokenName, "UNAVAILABLE TO SHARE REWARDS".red);
                        await timeout(RECTIMEOUT);
                        await recursive(n + 1);
                    }                   
                }
                else
                {
                    console.log("ALL TOKENS IN THE POOL PROCESSED".blue);
                    rewardStatus = true;                    
                }
            }
            await recursive(0);
        }
        return rewardStatus;
    }
    catch(error)
    {
        console.log("Error at rewardTokenProcess() : ", error);
        return rewardStatus;
    }
};

const findMintDataDb = async(poolName, tokenName) => {
	var findStatus = false;
	try
	{
		const client = await MongoClient.connect(DB_STRING, { useUnifiedTopology: true });
		const database = client.db(DB_NAME);
		const table = database.collection(DB_TABLE_MINT_NAME);
		
		var dateTimeStamp = await getDateTimeStamp();
		
		var findQuery = {			
			tokenName : tokenName,
            poolName : poolName,
			mintStatus : true,			
			dateTimeStamp : dateTimeStamp
		}
				
		const result = await table.find(findQuery).toArray();
		client.close();
		
		if(result.length > 0)
		{
			findStatus = true;	
		}		
		return findStatus;
	}
	catch(error)
	{
		console.log("Error at findMintDataDb() : ", error);
		return findStatus;
	}
};

const findProcessDataDb = async(poolName, tokenName) => {
	var findStatus = false;
	try
	{
		const client = await MongoClient.connect(DB_STRING, { useUnifiedTopology: true });
		const database = client.db(DB_NAME);
		const table = database.collection(DB_DIVIDEND_TABLE_NAME);
		
		var dateTimeStamp = await getDateTimeStamp();
		
		var findQuery = {
			tokenName : tokenName,
            poolName : poolName,
			rewardStatus : true,	
			dateTimeStamp : dateTimeStamp
		}
				
		const result = await table.find(findQuery).toArray();
		client.close();
		
		if(result.length > 0)
		{
			findStatus = true;
		}		
		return findStatus;
	}
	catch(error)
	{
		console.log("Error at findProcessDataDb() : ", error);
		return findStatus;
	}
};

const calcRewards = async(poolUsers, tokenQty) => {
    var jsonArray = [];
    try
    {
        if(poolUsers.length > 0)
		{
            for(i = 0; i < poolUsers.length; i += 1)
			{
                var poolShare = Math.floor((parseFloat(poolUsers[i].share) * tokenQty) * DECIMAL) / DECIMAL;
                if(poolShare > 0.0)
				{
					var ddata = {
						"rank" : poolUsers[i].rank,
						"account" : poolUsers[i].account,
						"stake" : parseFloat(poolUsers[i].stake) || 0.0,
						"share" : parseFloat(poolUsers[i].share) || 0.0,
						"total" : parseFloat(poolUsers[i].total) || 0.0,
						"pool" : poolShare
					}
					jsonArray.push(ddata);
				}
            }
            return jsonArray;
        }
        else
        {
            console.log("NO POOL USER DETAILS HERE".red);
			return jsonArray;
        }
    }
    catch(error)
    {
        console.log("Error at calcRewards() : ", error);
        return jsonArray;
    }
};

const checkTokenBalance = async(TOKENSYMBOL, tokenQty) => {
	var balanceStatus = false;
	try
	{
		let result = await ssc.findOne(BALANCECONTRACT, BALANCETABLE, { account: REWARDERNAME, symbol: TOKENSYMBOL });		
		if(result != null)
		{
			var tokenBalance = parseFloat(result.balance) || 0.0;
			var shareQty = Math.floor((tokenQty) * DECIMAL) / DECIMAL;
			if(tokenBalance >= shareQty)
			{
				balanceStatus = true;
			}	
		}
		return balanceStatus;
	}
	catch(error)
	{
		console.log("Error at checkTokenBalance() : ", error);
		return balanceStatus;
	}
};

const transPoolShare = async(rewardData, TOKENSYMBOL, POOLSYMBOL) => {
	var transStatus = false;
	try
	{
		const txs = [];
		let section = 0;
		let id = 1;
		
		console.log("TOTAL HOLDER LENGTH : ".blue, rewardData.length);
		for(i = 0; i < rewardData.length; i += 1) 
		{
			var dividendRank = rewardData[i].rank.toString();
			var dividendReward = rewardData[i].pool.toFixed(3);
			
			var memoTemp = config.reward_pools_setting.reward_setting.reward_memo;	
			var dividendMemo = memoTemp.replace('{{dividendrank}}', dividendRank)
			.replace('{{dividendreward}}', dividendReward)
			.replace('{{tokensymbol}}', TOKENSYMBOL)
			.replace('{{dividendtokensymbol}}', POOLSYMBOL);
			dividendMemo = dividendMemo.toString();
			
			var divHolderName = rewardData[i].account;
			
			const obj = {
				contractName: REWARDCONTRACT,
				contractAction: REWARDACTION,
				contractPayload: {
					symbol: TOKENSYMBOL,
					to: divHolderName,
					quantity: dividendReward,
					memo: dividendMemo
				}
			}
			
			if (id > 0 && id % 19 === 0) section += 1;
			if (!txs[section]) txs[section] = [];
			txs[section].push(obj);
			id += 1;
		}
		if (txs.length > 0) 
		{	
			for (let j = 0; j < txs.length; j += 1) 
			{				
				let holderTrans = await hive.custom_json(JSONID, txs[j], REWARDERNAME, REWARDERKEY, true);
				console.log("HOLDER TRANS : ", holderTrans);
				if(holderTrans.id != "")
				{
					console.log("HOLDER SHARE ".yellow + j + " SENT SUCCESSFULLY".green);
					console.log("TRANSACTION ID : ".green, holderTrans.id);
				}				
				await timeout(BLOCKTIMEOUT);				
			}
			transStatus = true;
		}
		else
		{
			console.log("NO HOLDER REWARDS TO SHARE".red);			
		}
		return transStatus;		
	}
	catch(error)
	{
		console.log("Error at transPoolShare() : ", error);
		return transStatus;		
	}
};

const insertDividendTransDb = async(tokenName, poolName, tokenQty) => {
	var insertStatus = false; 
	try
	{		
		const client = await MongoClient.connect(DB_STRING, { useUnifiedTopology: true });
		const database = client.db(DB_NAME);
		const table = database.collection(DB_DIVIDEND_TABLE_NAME);
		
		var timeNow = new Date().toISOString().substr(0, 19);
		var timeStampNow = await getTimeStamp(timeNow);		
		var dateTimeStamp = await getDateTimeStamp();
		
		var insertJson = {
			"tokenName" : tokenName,
            "poolName" : poolName,
			"tokenQty" : tokenQty,						
			"rewardStatus" : true,
			"rewardTime" : timeNow,
			"rewardTimeStamp" : timeStampNow,
			"dateTimeStamp" : dateTimeStamp
		}	
		
		const result = await table.insertOne(insertJson);
		client.close();	
		
		if(result.acknowledged == true)
		{			
			insertStatus = true;
		}	
		return insertStatus;				
	}
	catch(error)	
	{
		console.log("Error at insertDividendTransDb() : ", error);
		return insertStatus;
	}
};

const mintPoolToken = async(TOKENSYMBOL, POOLSYMBOL, TOTALMINT, MINTACCNAME, MINTACTIVEKEY) => {
	var mintDataArray = [];
	try
	{
		var currentDate = new Date().toISOString().substr(0, 19);		
		var date = currentDate.substr(0,10);		
		var time = currentDate.substr(11,19);
		
		var memoTemp = config.reward_pools_setting.mint_setting.mint_memo;	
		var memo = memoTemp.replace('{{tokensymbol}}', TOKENSYMBOL).replace('{{dividendtokensymbol}}', POOLSYMBOL).replace('{{date}}', date).replace('{{time}}', time);
		memo = memo.toString();	
		
		var transferObj = {
			contractName: MINTCONTRACT,
			contractAction: MINTACTION,
			contractPayload: {
				symbol: TOKENSYMBOL,
				to: REWARDERNAME,
				quantity: TOTALMINT.toFixed(3),
				memo: memo
			}
		}
			
		let mintTrans = await hive.custom_json(JSONID, transferObj, MINTACCNAME, MINTACTIVEKEY, true);
		console.log("MINT TRANS : ", mintTrans);			
		await timeout(HETIMEOUT);		
		if(mintTrans.id != "") 
		{
			console.log(TOKENSYMBOL.yellow, " MINTED SUCCESSFULLY".blue);			
			var ddata = {
				"mint_id" : mintTrans.id,
				"mint_status" : true
			};
			mintDataArray.push(ddata);	
		}
		else
		{
			console.log(TOKENSYMBOL.yellow, " MINT FAILED".red);
			var mintId = 0;
			var ddata = {
				"mint_id" : mintId,
				"mint_status" : false
			};
			mintDataArray.push(ddata);
		}
		return mintDataArray;		
	}
	catch(error)
	{
		console.log("Error at mintRewardToken() : ", error);
		var mintId = 0;
		var ddata = {
			"mint_id" : mintId,
			"mint_status" : false
		};
		mintDataArray.push(ddata);
		return mintStatus;
	}
};

const insertOneMintDb = async(transactionId, mintStatus, tokenName, tokenQty, poolName) => {
	var insertStatus = false; 
	try
	{		
		const client = await MongoClient.connect(DB_STRING, { useUnifiedTopology: true });
		const database = client.db(DB_NAME);
		const table = database.collection(DB_TABLE_MINT_NAME);
		
		var timeNow = new Date().toISOString().substr(0, 19);
		var timeStampNow = await getTimeStamp(timeNow);		
		var dateTimeStamp = await getDateTimeStamp();
		
		var insertJson = {
			"mintId" : transactionId,
			"mintStatus" : mintStatus,
			"tokenName" : tokenName,
			"tokenQty" : tokenQty,
			"mintTime" : timeNow,
			"mintTimeStamp" : timeStampNow,			
			"poolName" : poolName,
			"dateTimeStamp" : dateTimeStamp
		}	
		
		const result = await table.insertOne(insertJson);
		client.close();	
		
		if(result.acknowledged == true)
		{			
			insertStatus = true;
		}	
		return insertStatus;				
	}
	catch(error)	
	{
		console.log("Error at insertOneMintDb() : ", error);
		return insertStatus;
	}
};

const updatePoolData = async(poolName, poolNewCount) => {
    var updateStatus = false;
	try
	{		
		const client = await MongoClient.connect(DB_STRING, { useUnifiedTopology: true });
		const database = client.db(DB_NAME);
		const table = database.collection(DB_TABLE_POOL_NAME);
				
		var dateTimeStamp = await getDateTimeStamp();
		
		var findQuery = {
			poolName : poolName
		};

		var updateQuery = {
			"$set": {
				poolDayCount : poolNewCount,
                poolLastTimeStamp : dateTimeStamp
			}
		};

		const options = { 
			returnNewDocument: true 
		};	
		
		const result = await table.findOneAndUpdate(findQuery, updateQuery, options);
		client.close();	
		
		if(result.ok == 1)
		{
			updateStatus = true;
		}		
		return updateStatus;        
    }
    catch(error)
    {
        console.log("Error at updatePoolData() : ", error);
        return updateStatus;
    }
};

const insertOnePoolDb = async(poolName, poolNewCount) => {
	var insertStatus = false; 
	try
	{		
		const client = await MongoClient.connect(DB_STRING, { useUnifiedTopology: true });
		const database = client.db(DB_NAME);
		const table = database.collection(DB_TABLE_POOL_NAME);
					
		var dateTimeStamp = await getDateTimeStamp();
		
		var insertJson = {
			"poolName" : poolName,
			"poolInitTimeStamp" : dateTimeStamp,
			"poolDayCount" : poolNewCount,
			"poolLastTimeStamp" : dateTimeStamp
		}	
		
		const result = await table.insertOne(insertJson);
		client.close();	
		
		if(result.acknowledged == true)
		{			
			insertStatus = true;
		}	
		return insertStatus;				
	}
	catch(error)	
	{
		console.log("Error at insertOnePoolDb() : ", error);
		return insertStatus;
	}
};

const getDateTimeStamp = async() => {
	try
	{
		var dateOnly = new Date().toISOString().slice(0,11);		
		var dateOnlyISO = dateOnly + '00:00:00.000Z';
		var timeISODate = new Date(dateOnlyISO);
		var timeISOMilSec = timeISODate.getTime();
		
		var timeStamp = parseInt(timeISOMilSec);
		
		return timeStamp;
	}
	catch(error)
	{
		console.log("Error at getDateTimeStamp() : ", error);
	}
};

const getTimeStamp = async(blockTime) => {
	try
	{
		var timeISO = blockTime + '.000Z';		
		var timeISODate = new Date(timeISO);
		var timeISOMilSec = timeISODate.getTime();		
		var timeStamp = parseInt(timeISOMilSec);		
		return timeStamp;
	}
	catch(error)
	{
		console.log("Error at getTimeStamp() : ", error);
	}
};


//delete data
const deleteDividendShareTb = async() => {
	try
	{		
		const client = await MongoClient.connect(DB_STRING, { useUnifiedTopology: true });
		const database = client.db(DB_NAME);
		const table = database.collection(DB_DIVIDEND_TABLE_NAME);

		var currentTimeStamp = new Date().getTime();
		var maxRemoveDays = SUCCESSREMOVEDAYS * 86400000;
		var maxRemoveTime = currentTimeStamp - maxRemoveDays;
		
		var findQuery = {
			dateTimeStamp : { $lte:(maxRemoveTime)}
		};	
		
		const result = await table.deleteMany(findQuery);
		
		console.log(result.deletedCount, " DETAILS SUCCESSFULLY DELETED".blue);
		
		client.close();				
	}
	catch(error)	
	{
		console.log("Error at deleteDividendShareTb() : ", error);
	}
};

const deleteMintTb = async() => {
	try
	{		
		const client = await MongoClient.connect(DB_STRING, { useUnifiedTopology: true });
		const database = client.db(DB_NAME);
		const table = database.collection(DB_TABLE_MINT_NAME);

		var currentTimeStamp = new Date().getTime();
		var maxRemoveDays = SUCCESSREMOVEDAYS * 86400000;
		var maxRemoveTime = currentTimeStamp - maxRemoveDays;
		
		var findQuery = {
			dateTimeStamp : { $lte:(maxRemoveTime)}
		};	
		
		const result = await table.deleteMany(findQuery);
		
		console.log(result.deletedCount, " DETAILS SUCCESSFULLY DELETED".blue);
		
		client.close();				
	}
	catch(error)	
	{
		console.log("Error at deleteMintTb() : ", error);
	}
};

// trigger at utc time
const rulePooShare = {
	...config.trigger,
	tz: 'Etc/UTC',
};
if(config.enabled == true)
{
	schedule.scheduleJob(rulePooShare, deleteDividendShareTb);
    schedule.scheduleJob(rulePooShare, deleteMintTb);
	schedule.scheduleJob(rulePooShare, processDividends);
}