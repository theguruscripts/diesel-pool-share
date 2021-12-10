# diesel-pool-share
This script can be used to share dividend for rewarding to Diesel pool LP providers in Hive-Engine.

***
## Installation
This is a nodejs based application.
```
npm install --save
```
***
## Configuration
```javascript
{
    "enabled" : true,						//Set true to initiate reward share process
	"trigger" : {						//Set UTC Time to initiate the process (Default 00:15am)
		"hour" : 0,
		"minute" : 15
	},
	"ssc_api" : "https://api.hive-engine.com/rpc",		//Hive-Engine Api Call
	"json_id" : "ssc-mainnet-hive",				//Hive-Engine Json Id	
	"decimal" : 1000,
	"timeout" : 5000,
	"rec_timeout" : 1000,
	"he_timeout" : 9000,
	"block_timeout" : 9000,
    "contract_setting" : {
        "limit" : 1000
    },
    "reward_pools_setting" : {
        "pools" : [	//Add LP reward sending pools as follows
			//["POOL-NAME",
			// "NUMBER OF TOP LIQUIDITY PROVIDERS YOU WISH TO REWARD",
			// "NUMBER OF DAYS YOU WISH TO SHARE LP REWARDS",
			// "IF TRUE REWARD SEND TO POOL, IF FALSE REWARD WILL NOT SEND",
			// ["TOKEN SYMBOL", 
			//  "TOKEN AVAILABLE TO SHARE LP REWARDS",
			//  "DAILY REWARD TOKEN AMOUNT TO THE ABOVE POOL",
			//  "IF TRUE MINT REWARDS, IF FALSE NO MINT TO SHARE",
			//  "IF MINT, MINT ACCOUNT NAME",
			//  "IF MINT, MINT ACCOUNT ACTIVE KEYS"],
			//  ["ACCOUNTS THAT YOU WON'T SHARE LP REWARDS"]
			//]
	//Here you can see few examples
            ["SWAP.HIVE:BEE", "20", "365", true, [
                    ["bot", true, "10", true, "botfactory", "active-keys"], 
                    ["testo", true, "12", false, "", ""]
                ], 
                ["hive-engine", "aggroed"]
            ],
            ["SWAP.HIVE:DEC", "30", "10", true, [
                    ["bot", true, "10", true, "botfactory", "active-keys"], 
                    ["testo", true, "15", false, "", ""],
                    ["neoxag", true, "10", false, "", ""]
                ],
                []
            ],
            ["SWAP.HIVE:SWAP.HBD", "10", "50", false, [
                    ["bot", true, "5", true, "botfactory", "active-keys"]
                ],
                ["hive-engine"]
            ]
        ],
        "mint_setting" : {			
			"contract" : "tokens",
			"action" : "issue",
			"event" : "transferFromContract",				
			"mint_memo" : "Mint {{tokensymbol}} Tokens To {{dividendtokensymbol}} Reward Pool Share - ({{date}} / {{time}} Server Time)"
		},
        "reward_setting" : {
			"distributor_account" : "",		//Pool Rewards distributor account name
			"distributor_activekey" : "",		//Pool Rewards distributor account active keys (You can add this to .env file too)
			"contract" : "tokens",
			"action" : "transfer",
			"event" : "transfer",
			"reward_memo" : "Congratulations, You're Ranked {{dividendrank}} & You Earned {{dividendreward}} {{tokensymbol}} For Contributing {{dividendtokensymbol}}"
		},
		"balance_setting" : {
			"contract" : "tokens",
			"table" : "balances"
		},
        "pool_setting" : {
            "contract" : "marketpools",
            "table" : "liquidityPositions"
        }
    },
    "db_string" : "",						//Mongo Db Atlas - Connection Link (You can add this to .env file too)
	"db_name" : "pooldb",
	"db_table_pool_name" : "pooltb",
    "db_table_dividend_name" : "dividendtb",
    "db_table_mint_name" : "minttb",
	"db_remove_days" : 7,					//Due to use of free cluster (500Mb) better define maximum days to keep dividend share reward data
	"rpc_nodes" : [
		"https://api.deathwing.me",
		"https://hive.roelandp.nl",
		"https://api.openhive.network",
		"https://rpc.ausbit.dev",
		"https://hived.emre.sh",
		"https://hive-api.arcange.eu",
		"https://api.hive.blog",
		"https://api.c0ff33a.uk",
		"https://rpc.ecency.com",
		"https://anyx.io",
		"https://techcoderx.com",
		"https://hived.privex.io",
		"https://api.followbtcnews.com/"
	]
}
```
***
## Execute
```
node app.js
```
***
## Development
Encounter any issue or Bugs, Please report them [Here](https://github.com/theguruscripts/diesel-pool-share/issues).

The Script Developed by @theguruasia on HIVE.BLOG, @TheGuruAsia theguruasia#8947 on Discord.
