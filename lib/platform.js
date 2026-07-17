const PLATFORM_NAME = "Hygrotermograph";
const PLUGIN_NAME = "homebridge-mi-hygrothermograph-hb2";

class HygrothermographPlatform {
  constructor(log, config, api) {
    this.log = log;
    this.config = config || {};
    this.api = api;
    this.cachedAccessories = [];

    if (this.api != null) {
      this.api.on("didFinishLaunching", this.discoverAccessories.bind(this));
    }
  }

  configureAccessory(accessory) {
    this.cachedAccessories.push(accessory);
  }

  discoverAccessories() {
    const activeUUIDs = [];

    for (const accessoryConfig of this.config.accessories || []) {
      try {
        const uuid = this.getAccessoryUUID(accessoryConfig);
        activeUUIDs.push(uuid);
        const platformAccessory = this.getPlatformAccessory(
          uuid,
          accessoryConfig
        );
        const accessory = new this.HygrothermographAccessory(
          this.log,
          accessoryConfig
        );

        this.configurePlatformAccessory(platformAccessory, accessoryConfig);
        this.replaceServices(platformAccessory, accessory.getServices());

        if (this.cachedAccessories.includes(platformAccessory)) {
          this.api.updatePlatformAccessories([platformAccessory]);
        } else {
          this.cachedAccessories.push(platformAccessory);
          this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
            platformAccessory,
          ]);
        }
      } catch (error) {
        this.log.error(
          `Failed to configure accessory "${accessoryConfig.name}": ${error.message}`
        );
      }
    }

    const staleAccessories = this.cachedAccessories.filter(
      (accessory) => !activeUUIDs.includes(accessory.UUID)
    );
    if (staleAccessories.length > 0) {
      this.api.unregisterPlatformAccessories(
        PLUGIN_NAME,
        PLATFORM_NAME,
        staleAccessories
      );
      this.cachedAccessories = this.cachedAccessories.filter((accessory) =>
        activeUUIDs.includes(accessory.UUID)
      );
    }
  }

  getAccessoryUUID(accessoryConfig) {
    const identifier =
      accessoryConfig.address || accessoryConfig.id || accessoryConfig.name;
    return this.api.hap.uuid.generate(
      `${PLUGIN_NAME}:${
        accessoryConfig.type || "Hygrotermograph"
      }:${identifier}`
    );
  }

  getPlatformAccessory(uuid, accessoryConfig) {
    const cachedAccessory = this.cachedAccessories.find(
      (accessory) => accessory.UUID === uuid
    );
    if (cachedAccessory != null) {
      return cachedAccessory;
    }
    return new this.api.platformAccessory(accessoryConfig.name, uuid);
  }

  configurePlatformAccessory(platformAccessory, accessoryConfig) {
    platformAccessory.context.config = accessoryConfig;
    if (platformAccessory.displayName !== accessoryConfig.name) {
      platformAccessory.updateDisplayName(accessoryConfig.name);
    }
  }

  replaceServices(platformAccessory, services) {
    for (const service of [...platformAccessory.services]) {
      platformAccessory.removeService(service);
    }
    for (const service of services) {
      platformAccessory.addService(service);
    }
  }
}

module.exports = (homebridge) => {
  const { HygrothermographAccessory, AccessoryType } =
    require("./accessory")(homebridge);
  HygrothermographPlatform.prototype.HygrothermographAccessory =
    HygrothermographAccessory;
  return { HygrothermographPlatform, AccessoryType };
};
