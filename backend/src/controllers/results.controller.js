import { 
    getAttemptHistoryService, 
    deleteMockTestResultService 
} 
    from "../services/mockTest.service.js";

export async function getAllResults(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { status = "completed", page = 1, limit = 10 } = req.query;

    const allowedStatuses = [
      "completed",
      "submitted",
      "expired",
      "in_progress",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status filter",
        allowedStatuses,
      });
    }

    const history = await getAttemptHistoryService({
      userId,
      status,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Mock test attempt history fetched successfully",
      data: history.results,
      pagination: history.pagination,
    });
  } catch (error) {
    next(error);
  }
};


export async function deleteMockTestResultController(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const result = await deleteMockTestResultService(
      userId,
      req.params.attemptId
    );

    return res.status(200).json({
      success: true,
      message: "Mock-test result deleted successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
