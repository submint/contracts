import { labelhash } from "@ensdomains/ensjs/utils/labels";
import { namehash } from "@ensdomains/ensjs/utils/normalise";
import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers } from "hardhat";
import { DateTime } from "luxon";
import each from 'mocha-each';
import { MockAggregatorV3Interface, TestToken, TestNFT } from "../typechain-types";

const DAY = 24 * 60 * 60
const ETHUSD = 189376585000

const nodeL2Domain = namehash('fuses.eth')

async function deploy(name: string, _args?: any, owner?: string) {
  const args = _args || []

  const contractArtifacts = await ethers.getContractFactory(name)
  const contract = await contractArtifacts.connect(await ethers.getSigner(owner || deployer)).deploy(...args)
  return contract
}

async function deployController(warpperAddress: string, priceFeedAdddress: string, resolverAddress: string, owner?: string) {

  const contractArtifacts = await ethers.getContractFactory('SubnameMinterV1')
  const contract = await contractArtifacts.connect(await ethers.getSigner(owner || deployer)).deploy(warpperAddress, priceFeedAdddress, resolverAddress, BaseRegistrar.address)

  return contract
}

const FUSES = {
  CAN_DO_EVERYTHING: 0,
  CANNOT_UNWRAP: 1,
  CANNOT_BURN_FUSES: 2,
  CANNOT_TRANSFER: 4,
  CANNOT_SET_RESOLVER: 8,
  CANNOT_SET_TTL: 16,
  CANNOT_CREATE_SUBDOMAIN: 32,
  CANNOT_APPROVE: 64,
  PARENT_CANNOT_CONTROL: 2 ** 16,
  IS_DOT_ETH: 2 ** 17,
  CAN_EXTEND_EXPIRY: 2 ** 18,
}

const EMPTY_ADDRESS = '0x0000000000000000000000000000000000000000'

const EMPTY_BYTES32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000'

const ROOT_NODE = EMPTY_BYTES32

let ENSRegistry: any
let BaseRegistrar: any
let NameWrapper: any
let NameWrapper2: any
let MetaDataservice
let signers: any
let deployer: any
let ensOwner: any
let member: any
let member2: any
let controller: any
let feeRecipient: any
let royaltyRecipient: any
let result: any
let priceFeed: MockAggregatorV3Interface
let Resolver: Contract
let TestNFT: TestNFT
let TestToken: TestToken
let referrer1: any
let referrer2: any

interface Price {
  monthly: BigNumber[],
  yearly: BigNumber[],
  lifetime: BigNumber[]
}

// CANNOT_BURN_FUSES CANNOT_CREATE_SUBDOMAIN
const DEFAULT_SUBNAME_FUSESD = FUSES.PARENT_CANNOT_CONTROL | FUSES.CANNOT_UNWRAP | 64;

describe("SubnameMinterV1", function () {

  async function registerName(
    label: string,
    account: string,
    duration = 1200 * DAY,
  ) {
    const tokenId = labelhash(label)
    await BaseRegistrar.connect(await ethers.getSigner(controller)).register(tokenId, account, duration)
  }

  async function registerSetupAndWrapName(
    label: string,
    account: string,
    fuses: any,
    duration = 1200 * DAY,
  ) {
    const tokenId = labelhash(label)
    await BaseRegistrar.connect(await ethers.getSigner(controller)).register(tokenId, account, duration)
    await BaseRegistrar.connect(await ethers.getSigner(account)).setApprovalForAll(NameWrapper.address, true)
    await NameWrapper.connect(await ethers.getSigner(account)).wrapETH2LD(label, account, fuses, EMPTY_ADDRESS)
  }

  async function setUpSubname({
    prices = {
      monthly: [
        BigNumber.from(60 - 10).mul(10 ** 8),
        BigNumber.from(60 - 20).mul(10 ** 8),
        BigNumber.from(60).sub(30).mul(10 ** 8),
        BigNumber.from(60).sub(40).mul(10 ** 8),
        BigNumber.from(60).sub(50).mul(10 ** 8),
      ],
      yearly: [
        BigNumber.from(600).sub(100).mul(10 ** 8),
        BigNumber.from(600).sub(200).mul(10 ** 8),
        BigNumber.from(600).sub(300).mul(10 ** 8),
        BigNumber.from(600).sub(400).mul(10 ** 8),
        BigNumber.from(600).sub(500).mul(10 ** 8)
      ],
      lifetime: [
        BigNumber.from(1000).mul(10 ** 8),
        BigNumber.from(1000).mul(10 ** 8),
        BigNumber.from(1000).mul(10 ** 8),
        BigNumber.from(1000).mul(10 ** 8),
        BigNumber.from(1000).mul(10 ** 8)
      ]
    },
    recipient = feeRecipient,
    account = ensOwner,
    eligibliy = {
      tokens: [],
      amounts: []
    },
    parentDuration = 1200 * DAY,
  }: {
    recipient?: string,
    account?: string,
    prices?: Price,
    eligibliy?: {
      tokens: string[],
      amounts: number[]
    },
    parentDuration?: number
  }) {
    await registerSetupAndWrapName('fuses', ensOwner, FUSES.CANNOT_UNWRAP, parentDuration);

    const SubnameMinter = await ethers.getContractFactory("SubnameMinterV1");
    const controller = await SubnameMinter.connect(await ethers.getSigner(deployer)).deploy(NameWrapper.address, priceFeed.address, Resolver.address, BaseRegistrar.address)
    await NameWrapper.connect(await ethers.getSigner(ensOwner)).setApprovalForAll(controller.address, true)
    await controller.connect(await ethers.getSigner(account)).setUpSubname(
      nodeL2Domain,
      recipient,
      prices,
      eligibliy,
      DEFAULT_SUBNAME_FUSESD
    )
    await NameWrapper.connect(await ethers.getSigner(account)).setApprovalForAll(controller.address, true)

    return controller;
  }

  async function setUpSubnameAndRegister(
    ids: number[],
    recipient = feeRecipient,
    value: string = '',
    prices = {
      monthly: [
        BigNumber.from(60 - 10).mul(10 ** 8),
        BigNumber.from(60 - 20).mul(10 ** 8),
        BigNumber.from(60).sub(30).mul(10 ** 8),
        BigNumber.from(60).sub(40).mul(10 ** 8),
        BigNumber.from(60).sub(50).mul(10 ** 8),
      ],
      yearly: [
        BigNumber.from(600).sub(100).mul(10 ** 8),
        BigNumber.from(600).sub(200).mul(10 ** 8),
        BigNumber.from(600).sub(300).mul(10 ** 8),
        BigNumber.from(600).sub(400).mul(10 ** 8),
        BigNumber.from(600).sub(500).mul(10 ** 8)
      ],
      lifetime: [
        BigNumber.from(1000).mul(10 ** 8),
        BigNumber.from(1000).mul(10 ** 8),
        BigNumber.from(1000).mul(10 ** 8),
        BigNumber.from(1000).mul(10 ** 8),
        BigNumber.from(1000).mul(10 ** 8)
      ]
    },
    parentDuration = 1200 * DAY,
  ) {
    const controller = await setUpSubname({
      prices,
      recipient,
      parentDuration
    })
    const paidEther = value ? ethers.utils.parseEther(value) : ethers.utils.parseEther('3')
    await controller.connect(await ethers.getSigner(member)).submint(
      namehash('fuses.eth'),
      member,
      ids[0].toString(),
      {
        unit: 1,
        value: 1
      },
      []
      , {
        value: paidEther,
      }
    )
    return controller
  }

  before(async () => {
    signers = await ethers.getSigners()
    controller = await signers[0].getAddress()
    ensOwner = await signers[1].getAddress()
    feeRecipient = await signers[2].getAddress()
    royaltyRecipient = await signers[3].getAddress()
    deployer = await signers[4].getAddress()
    member = await signers[5].getAddress()
    member2 = await signers[6].getAddress()
    referrer1 = await signers[6].getAddress()
    referrer2 = await signers[7].getAddress()
    console.log({ controller, ensOwner, feeRecipient, royaltyRecipient, deployer, member, member2 })

    const MockAggregatorV3Interface = await ethers.getContractFactory("MockAggregatorV3Interface");
    priceFeed = await MockAggregatorV3Interface.connect(await ethers.getSigner(deployer)).deploy(ETHUSD);

    ENSRegistry = await deploy('ENSRegistry')

    TestNFT = (await deploy("TestNFT", ["Test", "TNT"], ensOwner)) as any
    TestToken = (await deploy("TestToken", [100000000], ensOwner)) as any

    BaseRegistrar = await deploy(
      'BaseRegistrarImplementation',
      [
        ENSRegistry.address,
        namehash('eth'),
      ]
    )

    await BaseRegistrar.connect(await ethers.getSigner(deployer)).addController(controller)
    // await BaseRegistrar.addController(ensOwner)

    MetaDataservice = await deploy(
      'StaticMetadataService',
      ['https://ens.domains',]
    )

    const ReverseRegistrar = await deploy(
      'ReverseRegistrar',
      [ENSRegistry.address,]
    )

    await ENSRegistry.connect(await ethers.getSigner(deployer)).setSubnodeOwner(
      ROOT_NODE,
      labelhash('reverse'),
      deployer)
    await ENSRegistry.connect(await ethers.getSigner(deployer)).setSubnodeOwner(
      namehash('reverse'),
      labelhash('addr'),
      ReverseRegistrar.address,
    )

    NameWrapper = await deploy(
      'NameWrapper',
      [
        ENSRegistry.address,
        BaseRegistrar.address,
        MetaDataservice.address,
      ]
    )
    NameWrapper2 = await deploy(
      'NameWrapper',
      [
        ENSRegistry.address,
        BaseRegistrar.address,
        MetaDataservice.address,
      ]
    )

    let oracleAddress = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419'

    const priceOracle = await deploy('ExponentialPremiumPriceOracle',
      [
        oracleAddress,
        [0, 0, '20294266869609', '5073566717402', '158548959919'],
        '100000000000000000000000000',
        21,
      ]
    )

    const deployArgs = {
      from: deployer,
      args: [
        ENSRegistry.address,
        priceOracle.address,
        60,
        86400,
        ReverseRegistrar.address,
        NameWrapper.address,
        ENSRegistry.address,
      ],
      log: true,
    }
    const ETHRegistrarController = await deploy('ETHRegistrarController', deployArgs.args)

    Resolver = await deploy(
      'PublicResolver',
      [
        // EMPTY_ADDRESS,
        ENSRegistry.address,
        EMPTY_ADDRESS,
        // NameWrapper.address,
        EMPTY_ADDRESS,
        // ETHRegistrarController.address,
        EMPTY_ADDRESS,
        // ReverseRegistrar.address
      ]
    )
    await ReverseRegistrar.connect(await ethers.getSigner(deployer)).setDefaultResolver(Resolver.address)

    // setup .eth
    await ENSRegistry.connect(await ethers.getSigner(deployer)).setSubnodeOwner(
      ROOT_NODE,
      labelhash('eth'),
      BaseRegistrar.address,
    )
  })

  beforeEach(async () => {
    result = await ethers.provider.send('evm_snapshot', [])
  })

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [result])
  })

  describe('setRoyalty', () => {

    it("should update royalty", async () => {
      const controller = await deployController(NameWrapper.address, priceFeed.address, Resolver.address)
      expect(await controller.serviceFeeRate()).to.equal(1000)
      await controller.setServiceFeeRate(200)
      expect(await controller.serviceFeeRate()).to.equal(200)
    })

    it("should use new royalty", async () => {
      const controller = await setUpSubnameAndRegister([0])
      await controller.setServiceFeeRate(200)
      const balanceBefore = await NameWrapper.provider.getBalance(controller.address)
      await controller.connect(await ethers.getSigner(member)).submint(
        namehash('fuses.eth'),
        ensOwner,
        '1',
        {
          unit: 1,
          value: 1
        },
        [],
        {
          value: ethers.utils.parseEther('1'),
        })
      const balanceAfter = await NameWrapper.provider.getBalance(controller.address)

      expect(
        BigNumber.from(balanceAfter.toBigInt() - balanceBefore.toBigInt())
      ).to.equal(ethers.utils.parseEther('1').mul(200).div(10000))
    })
  })

  describe('setWrapper', () => {

    it("should update wrapper address without error", async () => {
      const controller = await deployController(NameWrapper.address, priceFeed.address, Resolver.address)
      expect((await (await controller.nameWrapper()).toLowerCase())).to.equal(NameWrapper.address.toLowerCase())
      const newAddress = '0x060a082C900948A786B64ACE1713FB0dC8D8EfC7';
      await controller.setWrapper(newAddress)
      expect((await (await controller.nameWrapper()).toLowerCase())).to.equal(newAddress.toLowerCase())
    })

    it("should use new wrapper", async () => {
      const controller = await setUpSubname({
        recipient: feeRecipient
      })
      expect((await (await controller.nameWrapper()).toLowerCase())).to.equal(NameWrapper.address.toLowerCase())
    })

    it("should throw error if account is not contract owner", async () => {
      const controller = await deployController(NameWrapper.address, priceFeed.address, Resolver.address)
      const newAddress = '0x060a082C900948A786B64ACE1713FB0dC8D8EfC7';
      await expect(controller.connect(await ethers.getSigner(ensOwner)).setWrapper(newAddress))
        .to.be.rejectedWith(Error)
    })
  })

  describe('transferOwnership', () => {
    it('should transfer owner', async () => {
      const controller = await deployController(NameWrapper.address, priceFeed.address, Resolver.address)
      expect((await (await controller.owner()).toLowerCase())).to.equal(deployer.toLowerCase());
      await controller.transferOwnership(ensOwner);
      expect((await (await controller.owner()).toLowerCase())).to.equal(ensOwner.toLowerCase());
      await controller.connect(await ethers.getSigner(ensOwner)).transferOwnership(deployer);
    })
  })

  describe('setUpSubname', () => {
    it("should set without error", async () => {
      const prices: any = {
        monthly: [
          BigNumber.from(60 - 10).mul(10 ** 8),
          BigNumber.from(60 - 20).mul(10 ** 8),
          BigNumber.from(60).sub(30).mul(10 ** 8),
          BigNumber.from(60).sub(40).mul(10 ** 8),
          BigNumber.from(60).sub(50).mul(10 ** 8),
        ],
        yearly: [
          BigNumber.from(600).sub(100).mul(10 ** 8),
          BigNumber.from(600).sub(200).mul(10 ** 8),
          BigNumber.from(600).sub(300).mul(10 ** 8),
          BigNumber.from(600).sub(400).mul(10 ** 8),
          BigNumber.from(600).sub(500).mul(10 ** 8)
        ],
        lifetime: [
          BigNumber.from(1000).mul(10 ** 8),
          BigNumber.from(1000).mul(10 ** 8),
          BigNumber.from(1000).mul(10 ** 8),
          BigNumber.from(1000).mul(10 ** 8),
          BigNumber.from(1000).mul(10 ** 8)
        ]
      }
      const controller = await setUpSubname({
        prices,
        recipient: feeRecipient
      })
      const [result] = await controller.settingsOf(namehash('fuses.eth'))
      for (let index = 0; index < prices.length; index++) {
        expect(result[0][index]).to.equals(prices.monthly[index])
        expect(result[1][index]).to.equals(prices.yearly[index])
        expect(result[2][index]).to.equals(prices.lifetime[index])
      }
    })

    it("should throw error when fee is out of bounds", async function () {
      await registerSetupAndWrapName('fuses', ensOwner, FUSES.CANNOT_UNWRAP)
      const SubnameMinter = await ethers.getContractFactory("SubnameMinterV1");
      const controller = await SubnameMinter.deploy(NameWrapper.address, priceFeed.address, Resolver.address, BaseRegistrar.address)
      await expect(controller.connect(await ethers.getSigner(ensOwner)).setUpSubname(
        nodeL2Domain,
        feeRecipient,
        {
          monthly: [
            -1,
            BigNumber.from(60 - 20).mul(10 ** 8),
            BigNumber.from(60).sub(30).mul(10 ** 8),
            BigNumber.from(60).sub(40).mul(10 ** 8),
            BigNumber.from(60).sub(50).mul(10 ** 8),
          ],
          yearly: [
            BigNumber.from(600).sub(100).mul(10 ** 8),
            BigNumber.from(600).sub(200).mul(10 ** 8),
            BigNumber.from(600).sub(300).mul(10 ** 8),
            BigNumber.from(600).sub(400).mul(10 ** 8),
            BigNumber.from(600).sub(500).mul(10 ** 8)
          ],
          lifetime: [
            BigNumber.from(1000).mul(10 ** 8),
            BigNumber.from(1000).mul(10 ** 8),
            BigNumber.from(1000).mul(10 ** 8),
            BigNumber.from(1000).mul(10 ** 8),
            BigNumber.from(1000).mul(10 ** 8)
          ]
        },
        {
          tokens: [],
          amounts: []
        },
        DEFAULT_SUBNAME_FUSESD
      )).to.be.rejectedWith(/out-of-bounds/)
    })

    it("should throw error when acccount is not owner", async function () {
      const controller = await setUpSubname({})
      await expect(controller.connect(await ethers.getSigner(member)).setUpSubname(
        namehash('fuses.eth'),
        feeRecipient,
        {
          monthly: [
            BigNumber.from(60 - 10).mul(10 ** 8),
            BigNumber.from(60 - 20).mul(10 ** 8),
            BigNumber.from(60).sub(30).mul(10 ** 8),
            BigNumber.from(60).sub(40).mul(10 ** 8),
            BigNumber.from(60).sub(50).mul(10 ** 8),
          ],
          yearly: [
            BigNumber.from(600).sub(100).mul(10 ** 8),
            BigNumber.from(600).sub(200).mul(10 ** 8),
            BigNumber.from(600).sub(300).mul(10 ** 8),
            BigNumber.from(600).sub(400).mul(10 ** 8),
            BigNumber.from(600).sub(500).mul(10 ** 8)
          ],
          lifetime: [
            BigNumber.from(1000).mul(10 ** 8),
            BigNumber.from(1000).mul(10 ** 8),
            BigNumber.from(1000).mul(10 ** 8),
            BigNumber.from(1000).mul(10 ** 8),
            BigNumber.from(1000).mul(10 ** 8)
          ]
        },
        {
          tokens: [],
          amounts: []
        },
        DEFAULT_SUBNAME_FUSESD
      )).to.rejectedWith(/NotEnsOwner/)
    })

    it("should thow error when month prices are mismatch", async () => {
      const prices: any = {
        monthly: [
          BigNumber.from(60 - 10).mul(10 ** 8),
          BigNumber.from(60 - 20).mul(10 ** 8),
          BigNumber.from(60).sub(30).mul(10 ** 8),
          BigNumber.from(60).sub(40).mul(10 ** 8),
        ],
        yearly: [
          BigNumber.from(600).sub(100).mul(10 ** 8),
          BigNumber.from(600).sub(200).mul(10 ** 8),
          BigNumber.from(600).sub(300).mul(10 ** 8),
          BigNumber.from(600).sub(400).mul(10 ** 8),
          BigNumber.from(600).sub(500).mul(10 ** 8)
        ],
        lifetime: [
          BigNumber.from(1000).mul(10 ** 8),
          BigNumber.from(1000).mul(10 ** 8),
          BigNumber.from(1000).mul(10 ** 8),
          BigNumber.from(1000).mul(10 ** 8),
          BigNumber.from(1000).mul(10 ** 8)
        ]
      }
      await expect(setUpSubname({
        prices,
        recipient: feeRecipient
      })).to.be.rejectedWith(/InvalidPrices/)
    })

    it("should thow error when lifetime prices are mismatch", async () => {
      const prices: any = {
        monthly: [
          BigNumber.from(60 - 10).mul(10 ** 8),
          BigNumber.from(60 - 20).mul(10 ** 8),
          BigNumber.from(60).sub(30).mul(10 ** 8),
          BigNumber.from(60).sub(40).mul(10 ** 8),
        ],
        yearly: [
          BigNumber.from(600).sub(100).mul(10 ** 8),
          BigNumber.from(600).sub(200).mul(10 ** 8),
          BigNumber.from(600).sub(300).mul(10 ** 8),
          BigNumber.from(600).sub(400).mul(10 ** 8),
        ],
        lifetime: [
          BigNumber.from(1000).mul(10 ** 8),
          BigNumber.from(1000).mul(10 ** 8),
          BigNumber.from(1000).mul(10 ** 8),
          BigNumber.from(1000).mul(10 ** 8),
          BigNumber.from(1000).mul(10 ** 8)
        ]
      }
      await expect(setUpSubname({
        prices,
        recipient: feeRecipient
      })).to.be.rejectedWith(/InvalidPrices/)
    })

    it("should thow error when prices not set", async () => {
      const prices: any = {
        monthly: [
        ],
        yearly: [
        ],
        lifetime: [
        ]
      }
      await expect(setUpSubname({
        prices,
        recipient: feeRecipient
      })).to.be.rejectedWith(/InvalidPrices/)
    })
  })

  describe('submint', () => {

    it("should charge ether from member", async function () {
      const controller = await setUpSubname({})
      const memberBalanceBefore = await NameWrapper.provider.getBalance(member)
      const paidEther = ethers.utils.parseEther('5')
      const tx = await controller.connect(await ethers.getSigner(member)).submint(
        namehash('fuses.eth'),
        member,
        '1',
        {
          unit: 1,
          value: 1
        },
        []
        , {
          value: paidEther,
        });

      const receipt = await tx.wait()
      const gasFee = BigNumber.from(receipt.gasUsed).mul(receipt.effectiveGasPrice)
      const memberBalanceAfter = await controller.provider.getBalance(member)
      expect(
        BigNumber.from(memberBalanceBefore.toBigInt() - memberBalanceAfter.toBigInt() - gasFee.toBigInt()).div(paidEther)
      ).to.equal(1)
    })

    it("should send ether to fee recipient", async function () {
      const controller = await setUpSubname({})

      const ownerBalanceBefore = await controller.provider.getBalance(ensOwner)
      const paidEther = ethers.utils.parseEther('5')

      await controller.connect(await ethers.getSigner(member)).submint(
        namehash('fuses.eth'),
        ensOwner,
        '1',
        {
          unit: 1,
          value: 1
        },
        []
        , {
          value: paidEther,
        })
      const ownerBalanceAfter = await controller.provider.getBalance(ensOwner)
      expect(
        BigNumber.from(ownerBalanceAfter.toBigInt() - ownerBalanceBefore.toBigInt()).mul(10 ** 8).div(paidEther).toNumber() / 10000.0
      ).to.lessThanOrEqual(0.99)
    })

    it("should keep service fees on contract", async function () {
      const controller = await setUpSubname({})

      const controllerBalanceBefore = await controller.provider.getBalance(controller.address)
      const paidEther = ethers.utils.parseEther('5')
      await controller.connect(await ethers.getSigner(member)).submint(
        namehash('fuses.eth'),
        member,
        '1',
        {
          unit: 1,
          value: 1
        },
        []
        , {
          value: paidEther,
        })

      const controllerBalanceAfter = await controller.provider.getBalance(controller.address)

      expect(
        BigNumber.from(controllerBalanceAfter.toBigInt() - controllerBalanceBefore.toBigInt()).mul(10 ** 8).div(paidEther).toNumber() / 10 ** 8
      ).to.equal(0.1)
    })

    it("should send pass to member", async function () {
      const controller = await setUpSubname({})
      const paidEther = ethers.utils.parseEther('5')
      await controller.connect(await ethers.getSigner(member)).submint(
        namehash('fuses.eth'),
        member,
        '1',
        {
          unit: 1,
          value: 1
        },
        []
        , {
          value: paidEther,
        })

      // check owners
      expect(await NameWrapper.ownerOf(namehash("1.fuses.eth"))).to.equal(member)
      const [available1] = await controller.available(namehash("1.fuses.eth"))
      expect(available1).to.equal(false)
    })

    it("should set fuses and expiry", async function () {
      const controller = await setUpSubname({})
      const paidEther = ethers.utils.parseEther('5')
      await controller.connect(await ethers.getSigner(member)).submint(
        namehash('fuses.eth'),
        member,
        '1',
        {
          unit: 1,
          value: 1
        },
        []
        , {
          value: paidEther,
        })
      // check expiries
      const { expiry, fuses } = await NameWrapper.getData(namehash("1.fuses.eth"))
      expect(fuses & FUSES.PARENT_CANNOT_CONTROL).to.greaterThanOrEqual(1)
      expect(Math.abs(DateTime.fromSeconds(expiry.toNumber()).diff(DateTime.now(), ['days']).days - 30))
        .to.lessThanOrEqual(0.01)
    })

    it("should convert from usd to ether", async function () {
      const controller = await setUpSubname({})
      const memberBalanceBefore = await NameWrapper.provider.getBalance(member)
      const { priceInWei } = await controller.price(
        namehash('fuses.eth'),
        '1',
        {
          unit: 1,
          value: 1
        }
      )
      const tx = await controller.connect(await ethers.getSigner(member)).submint(
        namehash('fuses.eth'),
        member,
        '1',
        {
          unit: 1,
          value: 1
        },
        []
        , {
          value: priceInWei,
        });

      const receipt = await tx.wait()
      const gasFee = BigNumber.from(receipt.gasUsed).mul(receipt.effectiveGasPrice)
      const memberBalanceAfter = await controller.provider.getBalance(member)
      expect(
        BigNumber.from(memberBalanceBefore.toBigInt() - memberBalanceAfter.toBigInt() - gasFee.toBigInt()).div(priceInWei)
      ).to.equal(1)
    })

    it("should set expiry to parent expiry", async function () {
      const controller = await setUpSubname({})
      const memberBalanceBefore = await NameWrapper.provider.getBalance(member)
      const { priceInWei } = await controller.price(
        namehash('fuses.eth'),
        '1',
        {
          unit: 255,
          value: 1
        }
      )
      const tx = await controller.connect(await ethers.getSigner(member)).submint(
        namehash('fuses.eth'),
        member,
        '1',
        {
          unit: 255,
          value: 1
        },
        []
        , {
          value: priceInWei,
        });

      const receipt = await tx.wait()
      const gasFee = BigNumber.from(receipt.gasUsed).mul(receipt.effectiveGasPrice)
      const memberBalanceAfter = await controller.provider.getBalance(member)
      expect(
        BigNumber.from(memberBalanceBefore.toBigInt() - memberBalanceAfter.toBigInt() - gasFee.toBigInt()).div(priceInWei)
      ).to.equal(1)

      const { expiry: parentExpiry } = await NameWrapper.getData(namehash("fuses.eth"))
      const { expiry } = await NameWrapper.getData(namehash("1.fuses.eth"))
      expect(expiry).to.equal(parentExpiry);
    })

    it("should mint for free", async function () {
      const controller = await setUpSubname({
        prices: {
          monthly: [
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0),
          ],
          yearly: [
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0),
          ],
          lifetime: [
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0),
          ]
        }
      })
      await controller.connect(await ethers.getSigner(member)).submint(
        namehash('fuses.eth'),
        member,
        '1',
        {
          unit: 1,
          value: 1
        },
        []
      );

      const { expiry: parentExpiry } = await NameWrapper.getData(namehash("1.fuses.eth"))
      const { expiry } = await NameWrapper.getData(namehash("1.fuses.eth"))
      expect(expiry).to.equal(parentExpiry);
    })

    it("should throw error when expiry grearter than parent expiry", async function () {
      const controller = await setUpSubname({
        parentDuration: 60 * DAY
      })
      const duration = {
        unit: 1,
        value: 2 + 3 // 2 x 30 days + 90 days
      }
      const { priceInWei } = await controller.price(
        namehash('fuses.eth'),
        '1',
        duration
      )
      await expect(controller.connect(await ethers.getSigner(member)).submint(
        namehash('fuses.eth'),
        member,
        '1',
        duration
        ,
        [],
        {
          value: priceInWei,
        })).to.be.rejectedWith(/ExpiryGreaterThanParent/)
    })

    it("should throw error when duration unit is invalid", async function () {
      const controller = await setUpSubname({})
      await expect(controller.connect(await ethers.getSigner(member)).submint(
        namehash('fuses.eth'),
        member,
        '1',
        {
          unit: 3,
          value: 100
        },
        []
        , {
          value: ethers.utils.parseEther('1'),
        })).to.be.rejectedWith(/InvalidDurationUint/)
    })

    each([
      [1, 1, '1', 50], // 1 letter
      [2, 1, '1', 500],
      [1, 1, '11', 50], // 2 letters
      [2, 1, '11', 500],
      [1, 1, '111', 50], // 3 letters
      [2, 1, '111', 500],
      [1, 1, '1111', 50], // 4 letters
      [2, 1, '1111', 500],
      [1, 1, '11111', 50], // 5 letters
      [2, 1, '11111', 500],
    ]).it('should mint for unit %i and value %i', async (unit, value, subname, usd) => {
      const controller = await setUpSubname({
        prices: {
          monthly: [
            BigNumber.from(60 - 10).mul(10 ** 8),
            BigNumber.from(60 - 20).mul(10 ** 8),
            BigNumber.from(60).sub(30).mul(10 ** 8),
            BigNumber.from(60).sub(40).mul(10 ** 8),
            BigNumber.from(60).sub(50).mul(10 ** 8),
          ],
          yearly: [
            BigNumber.from(600).sub(100).mul(10 ** 8),
            BigNumber.from(600).sub(200).mul(10 ** 8),
            BigNumber.from(600).sub(300).mul(10 ** 8),
            BigNumber.from(600).sub(400).mul(10 ** 8),
            BigNumber.from(600).sub(500).mul(10 ** 8)
          ],
          lifetime: [
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0),
          ]
        }
      })
      const memberBalanceBefore = await NameWrapper.provider.getBalance(member)
      const { priceInWei } = await controller.price(
        namehash('fuses.eth'),
        '1',
        {
          unit,
          value
        }
      )
      const tx = await controller.connect(await ethers.getSigner(member)).submint(
        namehash('fuses.eth'),
        member,
        subname,
        {
          unit,
          value
        },
        []
        , {
          value: priceInWei,
        });
      const receipt = await tx.wait()
      const gasFee = BigNumber.from(receipt.gasUsed).mul(receipt.effectiveGasPrice)
      const memberBalanceAfter = await controller.provider.getBalance(member)
      expect(
        BigNumber.from(memberBalanceBefore.toBigInt() - memberBalanceAfter.toBigInt() - gasFee.toBigInt()).div(priceInWei)
      ).to.equal(1)
    });

    each([
      ['registed_wrapped'],
      ['registed_unwrapped'],
    ]).it('should mint subname when eligible for %s.eth', async (name) => {
      if (!name.includes('unregisted')) {
        if (!name.includes('unwrapped')) {
          await registerName(name, member)
        }
        else {
          await registerSetupAndWrapName(name, member, 0)
        }
      }
      const controller = await setUpSubname({
        eligibliy: {
          tokens: [BaseRegistrar.address],
          amounts: [0]
        }
      })
      const { priceInWei } = await controller.price(
        namehash('fuses.eth'),
        '1',
        {
          unit: 1,
          value: 1
        }
      )
      await controller.connect(await ethers.getSigner(member)).submint(
        namehash('fuses.eth'),
        member,
        name,
        {
          unit: 1,
          value: 1
        },
        []
        , {
          value: priceInWei,
        })
    });

    each([
      ['registed_wrapped'],
      ['registed_unwrapped'],
      ['unregisted'],
    ]).it('should throw error when not eligible for %s.eth', async (name) => {
      if (!name.includes('unregisted')) {
        if (!name.includes('unwrapped')) {
          await registerName(name, ensOwner)
        }
        else {
          await registerSetupAndWrapName(name, ensOwner, 0)
        }
      }
      const controller = await setUpSubname({
        eligibliy: {
          tokens: [BaseRegistrar.address],
          amounts: [0]
        }
      })
      const { priceInWei } = await controller.price(
        namehash('fuses.eth'),
        '1',
        {
          unit: 1,
          value: 1
        }
      )
      await expect(controller.connect(await ethers.getSigner(member)).submint(
        namehash('fuses.eth'),
        member,
        name,
        {
          unit: 1,
          value: 1
        },
        []
        , {
          value: priceInWei,
        })).to.be.rejectedWith(/NotEligible/)
    });

    it('should throw error when account does not has any NFT', async function () {
      await TestNFT.connect(await ethers.getSigner(ensOwner)).awardItem(ensOwner);
      const controller = await setUpSubname({
        eligibliy: {
          tokens: [TestNFT.address],
          amounts: [1]
        }
      })
      const { priceInWei } = await controller.price(
        namehash('fuses.eth'),
        '1',
        {
          unit: 1,
          value: 1
        }
      )
      await expect(
        controller.connect(await ethers.getSigner(member)).submint(
          namehash('fuses.eth'),
          member,
          "aaa",
          {
            unit: 1,
            value: 1
          },
          []
          , {
            value: priceInWei,
          })
      ).to.be.rejectedWith(/NotEligible/)
    });

    it('should throw error when account doest has NFT', async function () {
      await TestNFT.connect(await ethers.getSigner(member)).awardItem(member);
      const controller = await setUpSubname({
        eligibliy: {
          tokens: [TestNFT.address],
          amounts: [1]
        }
      })
      const { priceInWei } = await controller.price(
        namehash('fuses.eth'),
        '1',
        {
          unit: 1,
          value: 1
        }
      )
      await controller.connect(await ethers.getSigner(member)).submint(
        namehash('fuses.eth'),
        member,
        "aaa",
        {
          unit: 1,
          value: 1
        },
        []
        , {
          value: priceInWei,
        })
    });


    it('should throw error when not eligible for NFT', async function () {
      await TestNFT.connect(await ethers.getSigner(member)).awardItem(ensOwner);
      const controller = await setUpSubname({
        eligibliy: {
          tokens: [TestNFT.address],
          amounts: [1]
        }
      })
      const { priceInWei } = await controller.price(
        namehash('fuses.eth'),
        '1',
        {
          unit: 1,
          value: 1
        }
      )
      await expect(
        controller.connect(await ethers.getSigner(member)).submint(
          namehash('fuses.eth'),
          member,
          "1",
          {
            unit: 1,
            value: 1
          },
          []
          , {
            value: priceInWei,
          })
      ).to.be.rejectedWith(/NotEligible/)
    });

    it('should mint subname when eligible for NFT', async function () {
      await TestNFT.connect(await ethers.getSigner(member)).awardItem(member);
      const controller = await setUpSubname({
        eligibliy: {
          tokens: [TestNFT.address],
          amounts: [1]
        }
      })
      const { priceInWei } = await controller.price(
        namehash('fuses.eth'),
        '1',
        {
          unit: 1,
          value: 1
        }
      )
      await controller.connect(await ethers.getSigner(member)).submint(
        namehash('fuses.eth'),
        member,
        "1",
        {
          unit: 1,
          value: 1
        },
        []
        , {
          value: priceInWei,
        })
    });

    it('should mint subname when eligible for ERC20', async function () {
      await TestToken.connect(await ethers.getSigner(ensOwner)).transfer(member, 50);
      const controller = await setUpSubname({
        eligibliy: {
          tokens: [TestToken.address],
          amounts: [50]
        }
      })
      const { priceInWei } = await controller.price(
        namehash('fuses.eth'),
        '1',
        {
          unit: 1,
          value: 1
        }
      )
      await controller.connect(await ethers.getSigner(member)).submint(
        namehash('fuses.eth'),
        member,
        "1",
        {
          unit: 1,
          value: 1
        },
        []
        , {
          value: priceInWei,
        })
    });

    it('should throw error when not eligible for ERC20', async function () {
      await TestToken.connect(await ethers.getSigner(ensOwner)).transfer(member, 49);
      const controller = await setUpSubname({
        eligibliy: {
          tokens: [TestToken.address],
          amounts: [50]
        }
      })
      const { priceInWei } = await controller.price(
        namehash('fuses.eth'),
        '1',
        {
          unit: 1,
          value: 1
        }
      )
      await expect(controller.connect(await ethers.getSigner(member)).submint(
        namehash('fuses.eth'),
        member,
        "1",
        {
          unit: 1,
          value: 1
        },
        []
        , {
          value: priceInWei,
        })).to.be.rejectedWith(/NotEligible/)
    });

    it('should throw error when token address is not erc721 and erc20', async function () {
      await TestToken.connect(await ethers.getSigner(ensOwner)).transfer(member, 49);
      const controller = await setUpSubname({
        eligibliy: {
          tokens: [ENSRegistry.address],
          amounts: [50]
        }
      })
      const { priceInWei } = await controller.price(
        namehash('fuses.eth'),
        '1',
        {
          unit: 1,
          value: 1
        }
      )
      await expect(controller.connect(await ethers.getSigner(member)).submint(
        namehash('fuses.eth'),
        member,
        "1",
        {
          unit: 1,
          value: 1
        },
        []
        , {
          value: priceInWei,
        })).to.be.rejectedWith(/selector was not recognized|Transaction reverted/)
    });


    it("should reward referrer", async function () {
      const controller = await setUpSubname({})
      const memberBalanceBefore = await NameWrapper.provider.getBalance(member)
      const referer1BalanceBefore = await controller.provider.getBalance(referrer1)
      const referer2BalanceBefore = await controller.provider.getBalance(referrer2)
      const { priceInWei } = await controller.price(
        namehash('fuses.eth'),
        '1',
        {
          unit: 1,
          value: 1
        }
      )
      const tx = await controller.connect(await ethers.getSigner(member)).submint(
        namehash('fuses.eth'),
        member,
        '1',
        {
          unit: 1,
          value: 1
        },
        [
          {
            recipient: referrer1,
            rate: '40'
          },
          {
            recipient: referrer2,
            rate: '60'
          }
        ]
        , {
          value: priceInWei,
        });

      const receipt = await tx.wait()
      const gasFee = BigNumber.from(receipt.gasUsed).mul(receipt.effectiveGasPrice)
      const memberBalanceAfter = await controller.provider.getBalance(member)
      expect(
        BigNumber.from(memberBalanceBefore.toBigInt() - memberBalanceAfter.toBigInt() - gasFee.toBigInt()).div(priceInWei)
      ).to.equal(1)

      const referer1BalanceAfter = await controller.provider.getBalance(referrer1)
      expect(
        priceInWei.toBigInt() * 40n / 10000n / (referer1BalanceAfter.toBigInt() - referer1BalanceBefore.toBigInt())
      ).to.equals(1)

      const referer2BalanceAfter = await controller.provider.getBalance(referrer2)
      expect(
        priceInWei.toBigInt() * 60n / 10000n / (referer2BalanceAfter.toBigInt() - referer2BalanceBefore.toBigInt())
      ).to.equals(1)

    })

    it("should reward zero", async function () {
      const controller = await setUpSubname({})
      const memberBalanceBefore = await NameWrapper.provider.getBalance(member)
      const referer1BalanceBefore = await controller.provider.getBalance(referrer1)
      const { priceInWei } = await controller.price(
        namehash('fuses.eth'),
        '1',
        {
          unit: 1,
          value: 1
        }
      )
      const tx = await controller.connect(await ethers.getSigner(member)).submint(
        namehash('fuses.eth'),
        member,
        '1',
        {
          unit: 1,
          value: 1
        },
        [{
          recipient: referrer1,
          rate: '1010'
        }]
        , {
          value: priceInWei,
        });

      const receipt = await tx.wait()
      const gasFee = BigNumber.from(receipt.gasUsed).mul(receipt.effectiveGasPrice)
      const memberBalanceAfter = await controller.provider.getBalance(member)
      expect(
        BigNumber.from(memberBalanceBefore.toBigInt() - memberBalanceAfter.toBigInt() - gasFee.toBigInt()).div(priceInWei)
      ).to.equal(1)

      const referer1BalanceAfter = await controller.provider.getBalance(referrer1)
      expect(
        referer1BalanceAfter.toBigInt() - referer1BalanceBefore.toBigInt()
      ).to.equals(0)
    })

  })

  describe('withdraw', () => {
    it("should withdraw ethers", async function () {
      const controller = await setUpSubnameAndRegister([1, 2])
      const controllerBalanceBefore = await ethers.provider.getBalance(controller.address)
      const deployerBalanceBefore = await ethers.provider.getBalance(deployer)
      const tx = await controller.connect(await ethers.getSigner(deployer)).withdraw()
      const receipt = await tx.wait()
      const gasFee = BigNumber.from(receipt.gasUsed).mul(receipt.effectiveGasPrice)
      const controllerBalanceAfter = await ethers.provider.getBalance(controller.address)
      const deployerBalanceAfter = await ethers.provider.getBalance(deployer)
      // controller should have no ethers
      expect(controllerBalanceAfter).to.equal(0)
      // withdrawer should receive ethers
      expect(deployerBalanceAfter.sub(deployerBalanceBefore).add(gasFee)).to.equal(controllerBalanceBefore)
    })
  })

  describe('renew', () => {
    it("should renew subname 3 months", async function () {
      const controller = await setUpSubnameAndRegister([1, 2], feeRecipient, '',
        {
          monthly: [
            BigNumber.from(60 - 10).mul(10 ** 8),
            BigNumber.from(60 - 20).mul(10 ** 8),
            BigNumber.from(60).sub(30).mul(10 ** 8),
            BigNumber.from(60).sub(40).mul(10 ** 8),
            BigNumber.from(60).sub(50).mul(10 ** 8),
          ],
          yearly: [
            BigNumber.from(600).sub(100).mul(10 ** 8),
            BigNumber.from(600).sub(200).mul(10 ** 8),
            BigNumber.from(600).sub(300).mul(10 ** 8),
            BigNumber.from(600).sub(400).mul(10 ** 8),
            BigNumber.from(600).sub(500).mul(10 ** 8)
          ],
          lifetime: [
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0),
          ]
        }
      )
      const { priceInWei } = await controller.price(
        namehash('fuses.eth'),
        '1',
        {
          unit: 1,
          value: 3
        }
      )
      await controller.connect(await ethers.getSigner(member)).renew(
        namehash('fuses.eth'),
        "1",
        {
          unit: 1,
          value: 3
        },
        []
        , {
          value: priceInWei,
        })
      const { expiry } = await NameWrapper.getData(namehash("1.fuses.eth"))
      expect(Math.abs(120 - DateTime.fromSeconds(expiry.toNumber()).diff(DateTime.now(), ['days']).days)).to.lessThanOrEqual(0.01)
    })

    it("should renew subname 3 years", async function () {
      const controller = await setUpSubnameAndRegister([1, 2], feeRecipient, '',
        {
          monthly: [
            BigNumber.from(60 - 10).mul(10 ** 8),
            BigNumber.from(60 - 20).mul(10 ** 8),
            BigNumber.from(60).sub(30).mul(10 ** 8),
            BigNumber.from(60).sub(40).mul(10 ** 8),
            BigNumber.from(60).sub(50).mul(10 ** 8),
          ],
          yearly: [
            BigNumber.from(600).sub(100).mul(10 ** 8),
            BigNumber.from(600).sub(200).mul(10 ** 8),
            BigNumber.from(600).sub(300).mul(10 ** 8),
            BigNumber.from(600).sub(400).mul(10 ** 8),
            BigNumber.from(600).sub(500).mul(10 ** 8)
          ],
          lifetime: [
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0),
            BigNumber.from(0),
          ]
        }
      )
      const { priceInWei } = await controller.price(
        namehash('fuses.eth'),
        '1',
        {
          unit: 2,
          value: 3
        }
      )
      await controller.connect(await ethers.getSigner(member)).renew(
        namehash('fuses.eth'),
        "1",
        {
          unit: 2,
          value: 3
        },
        []
        , {
          value: priceInWei,
        })
      const { expiry } = await NameWrapper.getData(namehash("1.fuses.eth"))
      expect(Math.floor(DateTime.fromSeconds(expiry.toNumber()).diff(DateTime.now(), ['days']).days)).to.equals(365 * 3 + 30)
    })
  })

  describe('available', () => {

    it("should return available", async () => {
      const controller = await setUpSubnameAndRegister([1, 2])
      const [available] = await controller.available(namehash('3.fuses.eth'))
      expect(available).to.equal(true)
    })
    // it("should return available when expired", async () => {
    //   const controller = await setUpSubname({
    //     price: '0',
    //     recipient: feeRecipient,
    //   })
    //   const paidEther = ethers.utils.parseEther('0.5')
    //   await controller.connect(await ethers.getSigner(member)).submint(
    //     namehash('fuses.eth'),
    //     member,
    //     ['1']
    //     , {
    //       value: paidEther,
    //     })
    //   const [available] = await controller.available(namehash('1.fuses.eth'))
    //   expect(available).to.equal(true)
    // })

    it("should return inavailable", async () => {
      const controller = await setUpSubnameAndRegister([1, 2])
      const [available] = await controller.available(namehash('fuses.eth'))
      expect(available).to.equal(false)
    })

    it("should throw error when node is invalid", async () => {
      const controller = await setUpSubnameAndRegister([1, 2])
      await expect(controller.available('xxx')).to.be.rejectedWith(Error);
    })
  })

  describe("price", () => {
    it("should set price", async function () {
      const controller = await setUpSubnameAndRegister([1, 2], feeRecipient, '',
        {
          monthly: [
            BigNumber.from(60 - 10).mul(10 ** 8),
            BigNumber.from(60 - 20).mul(10 ** 8),
            BigNumber.from(60 - 30).mul(10 ** 8),
            BigNumber.from(60 - 40).mul(10 ** 8),
            BigNumber.from(60 - 50).mul(10 ** 8),
          ],
          yearly: [
            BigNumber.from(600 - 50).mul(10 ** 8),
            BigNumber.from(600 - 150).mul(10 ** 8),
            BigNumber.from(600 - 250).mul(10 ** 8),
            BigNumber.from(600 - 350).mul(10 ** 8),
            BigNumber.from(600 - 450).mul(10 ** 8),
          ],
          lifetime: [
            BigNumber.from(5000).mul(10 ** 8),
            BigNumber.from(6000).mul(10 ** 8),
            BigNumber.from(7000).mul(10 ** 8),
            BigNumber.from(8000).mul(10 ** 8),
            BigNumber.from(9000).mul(10 ** 8),
          ]
        }
      )

      const matrix = [
        [1, 1, 50],
        [1, 3, 150],
        [2, 1, 550],
        [2, 3, 1650],
        [255, 1, 5000],
        [255, 3, 5000]
      ]
      for (let index = 0; index < matrix.length; index++) {
        const [unit, value, expectedPrice] = matrix[index];
        const { priceInWei } = await controller.price(
          namehash('fuses.eth'),
          '1',
          {
            unit,
            value
          }
        )
        expect(priceInWei).to.equal(BigNumber.from(expectedPrice).mul(10 ** 8).mul(ethers.utils.parseEther('1')).div(ETHUSD))
      }
    })

    it("should throw error when lifetime is free but month is not", async function () {
      const controller = await setUpSubnameAndRegister([1, 2], feeRecipient, '',
        {
          monthly: [
            BigNumber.from(60 - 10).mul(10 ** 8),
          ],
          yearly: [
            BigNumber.from(0),
          ],
          lifetime: [
            BigNumber.from(0),
          ]
        }
      )
      await expect(controller.price(
        namehash('fuses.eth'),
        '1',
        {
          unit: 255,
          value: 1
        }
      )).to.rejectedWith(/InvalidDurationUint/)
    })

    it("should throw error when lifetime is free but year is not", async function () {
      const controller = await setUpSubnameAndRegister([1, 2], feeRecipient, '',
        {
          monthly: [
            BigNumber.from(0),
          ],
          yearly: [
            BigNumber.from(60 - 10).mul(10 ** 8),
          ],
          lifetime: [
            BigNumber.from(0),
          ]
        }
      )
      await expect(controller.price(
        namehash('fuses.eth'),
        '1',
        {
          unit: 255,
          value: 1
        }
      )).to.rejectedWith(/InvalidDurationUint/)
    })
  })

  describe("eligible", () => {
    it("should eligible", async function () {
      await TestNFT.connect(await ethers.getSigner(member)).awardItem(member);
      const controller = await setUpSubname({
        eligibliy: {
          tokens: [TestNFT.address],
          amounts: [1]
        }
      })
      const eligible = await controller.eligible(
        namehash('fuses.eth'),
        member,
        'xxxx',
      )
      expect(eligible).to.equal(true)
    })

    it("should not eligible for non empty name", async function () {
      const controller = await setUpSubname({
        eligibliy: {
          tokens: [TestNFT.address],
          amounts: [1]
        }
      })
      const eligible = await controller.eligible(
        namehash('fuses.eth'),
        member,
        'xxx',
      )
      expect(eligible).to.equal(false)
    })

    it("should eligible for empty name", async function () {
      const controller = await setUpSubname({
        eligibliy: {
          tokens: [TestNFT.address],
          amounts: [1]
        }
      })
      const eligible = await controller.eligible(
        namehash('fuses.eth'),
        member,
        '',
      )
      expect(eligible).to.equal(true)
    })

    it("should not eligible for digits name", async function () {
      const controller = await setUpSubname({
        eligibliy: {
          tokens: [TestNFT.address],
          amounts: [1]
        }
      })
      const eligible = await controller.eligible(
        namehash('fuses.eth'),
        member,
        '11111',
      )
      expect(eligible).to.equal(false)
    })

  })

});
