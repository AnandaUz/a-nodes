import {
  setupTestNodeEnv,
  setupNodeTestEnv,
  createTestTextNode,
  createTestTree,
  dragNode,
  clickEmptySpace,
  type NodeTestEnv,
  type CreateTestNodeOptions,
  type TestTreeSpec,
} from "@/features/nodes/__tests__/nodeTestFactory";

export {
  setupTestNodeEnv,
  setupNodeTestEnv,
  createTestTextNode,
  createTestTree,
  dragNode,
  clickEmptySpace,
  type NodeTestEnv,
  type CreateTestNodeOptions,
  type TestTreeSpec,
};

export const NodeTestFactory = {
  setupEnv: setupTestNodeEnv,
  createText: createTestTextNode,
  createTree: createTestTree,
  dragNode,
  clickEmptySpace,
};

export default NodeTestFactory;
