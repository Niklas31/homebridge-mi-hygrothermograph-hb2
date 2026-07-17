const assert = require("assert");
const proxyquire = require("proxyquire").noCallThru();
const sinon = require("sinon");
const { describe, it, beforeEach, afterEach } = require("mocha");
const { mockLogger } = require("./mocks");

class PlatformAccessoryMock {
  constructor(displayName, UUID) {
    this.displayName = displayName;
    this.UUID = UUID;
    this.context = {};
    this.services = [];
  }

  addService(service) {
    this.services.push(service);
  }

  removeService(service) {
    this.services = this.services.filter((item) => item !== service);
  }

  updateDisplayName(displayName) {
    this.displayName = displayName;
  }
}

describe("platform", () => {
  beforeEach(() => {
    this.uuidGenerateStub = sinon.stub().callsFake((value) => `uuid:${value}`);
    this.api = {
      hap: {
        uuid: {
          generate: this.uuidGenerateStub,
        },
      },
      on: sinon.stub(),
      platformAccessory: PlatformAccessoryMock,
      registerPlatformAccessories: sinon.stub(),
      updatePlatformAccessories: sinon.stub(),
      unregisterPlatformAccessories: sinon.stub(),
    };
    this.AccessoryStub = sinon.stub();
    this.AccessoryStub.prototype.getServices = sinon
      .stub()
      .returns(["service"]);
    const { HygrothermographPlatform } = proxyquire("../lib/platform", {
      "./accessory": () => ({
        HygrothermographAccessory: this.AccessoryStub,
      }),
    })({});
    this.HygrothermographPlatform = HygrothermographPlatform;
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should register didFinishLaunching handler", () => {
    new this.HygrothermographPlatform(mockLogger, {}, this.api);
    assert(this.api.on.calledWith("didFinishLaunching"));
  });

  it("should cache restored accessories", () => {
    const platform = new this.HygrothermographPlatform(
      mockLogger,
      {},
      this.api
    );
    const accessory = new PlatformAccessoryMock("Room", "uuid");
    platform.configureAccessory(accessory);
    assert.deepStrictEqual(platform.cachedAccessories, [accessory]);
  });

  it("should not register accessories without configuration", () => {
    const platform = new this.HygrothermographPlatform(
      mockLogger,
      {},
      this.api
    );
    platform.discoverAccessories();
    assert(this.api.registerPlatformAccessories.notCalled);
    assert(this.AccessoryStub.notCalled);
  });

  it("should register configured accessories", () => {
    const accessoryConfig = {
      name: "Temperature & Humidity",
      address: "4c:64:a8:d0:ae:65",
    };
    const platform = new this.HygrothermographPlatform(
      mockLogger,
      {
        accessories: [accessoryConfig],
      },
      this.api
    );
    platform.discoverAccessories();

    assert(this.AccessoryStub.calledWithNew());
    assert(this.AccessoryStub.calledWith(mockLogger, accessoryConfig));
    assert(this.api.registerPlatformAccessories.calledOnce);
    const registeredAccessory =
      this.api.registerPlatformAccessories.firstCall.args[2][0];
    assert.strictEqual(registeredAccessory.displayName, accessoryConfig.name);
    assert.strictEqual(registeredAccessory.services[0], "service");
    assert.strictEqual(registeredAccessory.context.config, accessoryConfig);
  });

  it("should update cached accessories", () => {
    const accessoryConfig = {
      name: "Renamed Room",
      address: "4c:64:a8:d0:ae:65",
    };
    const uuid =
      "uuid:homebridge-mi-hygrothermograph-hb2:Hygrotermograph:4c:64:a8:d0:ae:65";
    const cachedAccessory = new PlatformAccessoryMock("Room", uuid);
    cachedAccessory.services = ["old-service"];
    const platform = new this.HygrothermographPlatform(
      mockLogger,
      {
        accessories: [accessoryConfig],
      },
      this.api
    );
    platform.configureAccessory(cachedAccessory);
    platform.discoverAccessories();

    assert(this.api.updatePlatformAccessories.calledWith([cachedAccessory]));
    assert.strictEqual(cachedAccessory.displayName, "Renamed Room");
    assert.deepStrictEqual(cachedAccessory.services, ["service"]);
  });

  it("should unregister stale cached accessories", () => {
    const staleAccessory = new PlatformAccessoryMock("Old Room", "stale-uuid");
    const platform = new this.HygrothermographPlatform(
      mockLogger,
      {
        accessories: [],
      },
      this.api
    );
    platform.configureAccessory(staleAccessory);
    platform.discoverAccessories();

    assert(
      this.api.unregisterPlatformAccessories.calledWith(
        "homebridge-mi-hygrothermograph-hb2",
        "Hygrotermograph",
        [staleAccessory]
      )
    );
    assert.deepStrictEqual(platform.cachedAccessories, []);
  });

  it("should log accessory configuration errors", () => {
    const log = {
      ...mockLogger,
      error: sinon.stub(),
    };
    this.AccessoryStub.throws(new Error("Unsupported accessory type"));
    const platform = new this.HygrothermographPlatform(
      log,
      {
        accessories: [{ name: "Broken" }],
      },
      this.api
    );
    platform.discoverAccessories();

    assert(log.error.calledWithMatch(/Failed to configure accessory "Broken"/));
  });
});
